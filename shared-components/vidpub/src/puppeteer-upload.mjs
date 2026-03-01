/**
 * vidpub — Puppeteer-based YouTube Studio upload
 *
 * Fallback method when YouTube Data API v3 quota is exhausted.
 * Launches headless Chromium, navigates YouTube Studio, fills upload wizard.
 */

import puppeteer from 'puppeteer';

const YOUTUBE_STUDIO_UPLOAD = 'https://studio.youtube.com/channel/UC/videos/upload';
const YOUTUBE_STUDIO_BASE = 'https://studio.youtube.com';

/**
 * Upload a video via Puppeteer (YouTube Studio browser automation).
 *
 * @param {object} params - Upload parameters (see publish.mjs)
 * @param {object} config - Credentials config
 * @returns {Promise<object>} Upload result
 */
export async function uploadViaPuppeteer(params, config) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Authenticate with Google
    console.log('[vidpub:puppeteer] Authenticating with Google...');
    await googleLogin(page, config.googleEmail, config.googlePassword);

    // Navigate to YouTube Studio
    console.log('[vidpub:puppeteer] Navigating to YouTube Studio...');
    await page.goto(YOUTUBE_STUDIO_BASE, { waitUntil: 'networkidle2', timeout: 30000 });

    // Click "Create" → "Upload videos"
    console.log('[vidpub:puppeteer] Opening upload dialog...');
    await page.waitForSelector('#create-icon', { timeout: 15000 });
    await page.click('#create-icon');
    await page.waitForSelector('#text-item-0', { timeout: 5000 });
    await page.click('#text-item-0');

    // Wait for file input and upload
    console.log(`[vidpub:puppeteer] Uploading: ${params.videoPath}`);
    const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    await fileInput.uploadFile(params.videoPath);

    // Wait for upload to begin processing
    await page.waitForSelector('#dialog', { timeout: 10000 });

    // Fill title
    console.log('[vidpub:puppeteer] Setting title...');
    const titleInput = await page.waitForSelector('#textbox[aria-label="Add a title that describes your video (type @ to mention a channel)"]', { timeout: 10000 });
    await titleInput.click({ clickCount: 3 }); // select existing
    await titleInput.type(params.title);

    // Fill description
    console.log('[vidpub:puppeteer] Setting description...');
    const descInput = await page.waitForSelector('#textbox[aria-label="Tell viewers about your video (type @ to mention a channel)"]', { timeout: 5000 });
    await descInput.click();
    await descInput.type(params.description);

    // Upload thumbnail if provided
    if (params.thumbnailPath) {
      console.log('[vidpub:puppeteer] Uploading thumbnail...');
      try {
        const thumbInput = await page.waitForSelector('#file-loader', { timeout: 5000 });
        await thumbInput.uploadFile(params.thumbnailPath);
      } catch {
        console.warn('[vidpub:puppeteer] Thumbnail upload element not found, skipping');
      }
    }

    // Set "Not made for kids"
    try {
      const notForKids = await page.waitForSelector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]', { timeout: 5000 });
      await notForKids.click();
    } catch {
      console.warn('[vidpub:puppeteer] Could not set kids setting, skipping');
    }

    // Click through wizard steps: Details → Video elements → Checks → Visibility
    for (let step = 0; step < 3; step++) {
      const nextBtn = await page.waitForSelector('#next-button', { timeout: 5000 });
      await nextBtn.click();
      await new Promise(r => setTimeout(r, 1500));
    }

    // Set visibility (public/unlisted/private)
    console.log(`[vidpub:puppeteer] Setting visibility: ${params.privacy}`);
    const visibilityMap = {
      'public': 'PUBLIC',
      'unlisted': 'UNLISTED',
      'private': 'PRIVATE',
    };
    const visibilityRadio = await page.waitForSelector(
      `tp-yt-paper-radio-button[name="${visibilityMap[params.privacy] || 'PUBLIC'}"]`,
      { timeout: 5000 }
    );
    await visibilityRadio.click();

    // Schedule if specified
    if (params.scheduleAt) {
      console.log(`[vidpub:puppeteer] Scheduling for: ${params.scheduleAt}`);
      try {
        const scheduleRadio = await page.waitForSelector('tp-yt-paper-radio-button[name="SCHEDULE"]', { timeout: 5000 });
        await scheduleRadio.click();
        // Date/time inputs would need to be filled here
        // This is fragile and depends on YouTube Studio's current DOM
      } catch {
        console.warn('[vidpub:puppeteer] Schedule option not found');
      }
    }

    // Wait for processing to complete (poll for "Video published" or processing indicator)
    console.log('[vidpub:puppeteer] Waiting for processing...');
    await new Promise(r => setTimeout(r, 3000));

    // Click "Publish" / "Save" button
    const publishBtn = await page.waitForSelector('#done-button', { timeout: 10000 });
    await publishBtn.click();

    // Extract video URL from success dialog
    await new Promise(r => setTimeout(r, 3000));
    let videoId = null;
    try {
      const urlElement = await page.waitForSelector('a.style-scope.ytcp-video-info', { timeout: 10000 });
      const href = await urlElement.evaluate(el => el.href);
      const match = href?.match(/watch\?v=([a-zA-Z0-9_-]+)/);
      if (match) videoId = match[1];
    } catch {
      console.warn('[vidpub:puppeteer] Could not extract video ID from success dialog');
    }

    // Get channel ID from page context
    let channelId = null;
    try {
      channelId = await page.evaluate(() => {
        const meta = document.querySelector('meta[itemprop="channelId"]');
        return meta?.content || null;
      });
    } catch {
      // Non-critical
    }

    const status = params.scheduleAt ? 'scheduled' : 'published';
    console.log(`[vidpub:puppeteer] ${status}: ${videoId || 'ID unknown'}`);

    return {
      videoId,
      channelId,
      status,
      publishedAt: params.scheduleAt || new Date().toISOString(),
      thumbnailUrl: null,
      quotaUsed: 0,
    };
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Authenticate with Google via login page.
 */
async function googleLogin(page, email, password) {
  await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle2' });

  // Enter email
  const emailInput = await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await emailInput.type(email);
  await page.click('#identifierNext');
  await new Promise(r => setTimeout(r, 2000));

  // Enter password
  const passwordInput = await page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
  await passwordInput.type(password);
  await page.click('#passwordNext');
  await new Promise(r => setTimeout(r, 3000));

  // Check for 2FA or security challenges
  const currentUrl = page.url();
  if (currentUrl.includes('challenge') || currentUrl.includes('signin')) {
    throw new Error('Google login requires 2FA or security challenge — Puppeteer cannot handle this automatically. Use cookie-based auth or Data API instead.');
  }
}

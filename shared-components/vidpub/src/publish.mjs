/**
 * vidpub — YouTube video publishing
 *
 * Primary: YouTube Data API v3 (OAuth2 resumable upload)
 * Fallback: Puppeteer-based YouTube Studio upload
 */

import { uploadViaApi } from './api-upload.mjs';
import { uploadViaPuppeteer } from './puppeteer-upload.mjs';
import { loadConfig } from './config.mjs';

/**
 * Publish a video to YouTube.
 *
 * @param {object} opts
 * @param {string} opts.videoPath        - Path to MP4 file
 * @param {string} opts.title            - Video title (max 100 chars)
 * @param {string} opts.description      - Video description
 * @param {string[]} [opts.tags]         - Tag strings
 * @param {string} [opts.thumbnailPath]  - Path to thumbnail image
 * @param {number} [opts.categoryId=22]  - YouTube category ID
 * @param {string} [opts.language='en']  - Language code
 * @param {string} [opts.privacy='public'] - public | unlisted | private
 * @param {string} [opts.scheduleAt]     - ISO 8601 datetime for scheduled publish
 * @param {string} [opts.playlistId]     - Playlist ID to add video to
 * @param {boolean} [opts.notifySubscribers=true]
 * @param {string} [opts.method='api']   - 'api' | 'puppeteer'
 * @returns {Promise<object>} Publish result
 */
export async function publish(opts) {
  const config = loadConfig();
  const startTime = Date.now();

  const params = {
    videoPath: opts.videoPath,
    title: (opts.title || '').slice(0, 100),
    description: opts.description || '',
    tags: opts.tags || [],
    thumbnailPath: opts.thumbnailPath || null,
    categoryId: opts.categoryId || 22,
    language: opts.language || 'en',
    privacy: opts.privacy || 'public',
    scheduleAt: opts.scheduleAt || null,
    playlistId: opts.playlistId || null,
    notifySubscribers: opts.notifySubscribers !== false,
  };

  const method = opts.method || 'api';

  // Validate video file exists
  const { existsSync } = await import('node:fs');
  if (!existsSync(params.videoPath)) {
    return makeResult(params, 'failed', method, startTime, `Video file not found: ${params.videoPath}`);
  }

  // If scheduled, force privacy to private (YouTube requirement)
  if (params.scheduleAt) {
    params.privacy = 'private';
  }

  // Try API method first (unless puppeteer explicitly requested)
  if (method !== 'puppeteer' && config.hasApiCredentials) {
    try {
      const result = await uploadViaApi(params, config);
      return makeResult(params, result.status, 'api', startTime, null, result);
    } catch (err) {
      // Quota exhausted (403) → fall through to puppeteer
      if (err.code === 403 || err.message?.includes('quota')) {
        console.log('[vidpub] API quota exhausted, falling back to Puppeteer...');
      } else {
        return makeResult(params, 'failed', 'api', startTime, err.message);
      }
    }
  }

  // Puppeteer fallback
  if (config.hasPuppeteerCredentials || method === 'puppeteer') {
    try {
      const result = await uploadViaPuppeteer(params, config);
      return makeResult(params, result.status, 'puppeteer', startTime, null, result);
    } catch (err) {
      return makeResult(params, 'failed', 'puppeteer', startTime, err.message);
    }
  }

  return makeResult(params, 'failed', method, startTime, 'No valid credentials configured. Set YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN for API, or GOOGLE_EMAIL/PASSWORD for Puppeteer.');
}

function makeResult(params, status, method, startTime, error, uploadResult = {}) {
  return {
    videoId: uploadResult.videoId || null,
    url: uploadResult.videoId ? `https://youtube.com/watch?v=${uploadResult.videoId}` : null,
    channelId: uploadResult.channelId || null,
    status,
    method,
    publishedAt: uploadResult.publishedAt || (status === 'published' ? new Date().toISOString() : null),
    thumbnailUrl: uploadResult.thumbnailUrl || null,
    quotaUsed: method === 'api' ? (uploadResult.quotaUsed || 1600) : 0,
    durationMs: Date.now() - startTime,
    error: error || null,
  };
}

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import sharp from 'sharp';
import { config } from '../config';
import {
  ImageConfig,
  ScriptSection,
  SlideImage,
  GeneratedImage,
} from '../types';

/**
 * Build an image generation prompt from a script section.
 * Extracts the core visual concept and appends the style directive.
 */
function buildImagePrompt(section: ScriptSection, stylePrompt: string): string {
  const slideTitle =
    'title' in section.slideData ? (section.slideData as any).title : '';
  const narration = section.narrationText.slice(0, 200);
  return `A visual representation of: "${slideTitle}". Context: ${narration}. Style: ${stylePrompt}. No text or words in the image.`;
}

/**
 * Download a file from a URL to a local path.
 */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        https.get(response.headers.location!, (r2) => {
          r2.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

/**
 * Call OpenAI's image generation API (DALL-E 3).
 * Returns the URL of the generated image.
 */
async function callOpenAIImageAPI(
  prompt: string,
  imageConfig: ImageConfig
): Promise<string> {
  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY required for image generation');
  }

  const body = JSON.stringify({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: imageConfig.size,
    quality: imageConfig.quality,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/images/generations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`OpenAI API ${res.statusCode}: ${data.slice(0, 300)}`));
            return;
          }
          const json = JSON.parse(data);
          resolve(json.data[0].url);
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Determine which sections should get generated images based on frequency config.
 * Skips title and CTA slides.
 */
function selectSectionsForImages(
  sections: ScriptSection[],
  frequency: number
): ScriptSection[] {
  const contentSections = sections.filter(
    (s) => s.slideType !== 'title' && s.slideType !== 'cta'
  );
  if (frequency <= 0) return [];
  return contentSections.filter((_, i) => i % frequency === 0);
}

/**
 * Generate images for selected script sections and return image metadata.
 */
export async function generateImages(
  sections: ScriptSection[],
  imageConfig: ImageConfig,
  jobDir: string
): Promise<GeneratedImage[]> {
  if (!imageConfig.enabled || !config.openaiApiKey) {
    return [];
  }

  const imagesDir = path.join(jobDir, 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  const targetSections = selectSectionsForImages(sections, imageConfig.frequency);
  const results: GeneratedImage[] = [];

  for (const section of targetSections) {
    const prompt = buildImagePrompt(section, imageConfig.stylePrompt);
    console.log(
      `  Generating image for section ${section.sectionIndex}: ${section.slideType}`
    );

    try {
      const imageUrl = await callOpenAIImageAPI(prompt, imageConfig);
      const filePath = path.join(
        imagesDir,
        `image-${String(section.sectionIndex).padStart(3, '0')}.png`
      );
      await downloadFile(imageUrl, filePath);

      results.push({
        sectionIndex: section.sectionIndex,
        filePath,
        prompt,
      });
    } catch (err: any) {
      console.warn(
        `  Warning: Image generation failed for section ${section.sectionIndex}: ${err.message}`
      );
      // Continue without this image — graceful degradation
    }
  }

  // Save image manifest
  fs.writeFileSync(
    path.join(imagesDir, 'manifest.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

/**
 * Composite a generated image onto a slide using Sharp.
 * Supports 'background', 'overlay', 'fullscreen', and 'side'.
 * Portrait 'side': image on TOP 40%, slide content on BOTTOM 60%.
 */
export async function compositeImageOnSlide(
  slidePath: string,
  imagePath: string,
  placement: ImageConfig['placement'],
  opacity: number,
  outputPath: string,
  resolution?: { width: number; height: number }
): Promise<void> {
  const W = resolution?.width ?? 1920;
  const H = resolution?.height ?? 1080;
  const isPortrait = H > W;
  const slideBuffer = fs.readFileSync(slidePath);
  const imageBuffer = await sharp(imagePath)
    .resize(W, H, { fit: 'cover' })
    .toBuffer();

  if (placement === 'background') {
    // Image as darkened background with slide content readable on top.
    // The slide has a fully-opaque gradient, so we reduce it to ~80%
    // opacity — the dark bg becomes semi-transparent (image peeks
    // through) while bright text/cards stay highly readable.
    const darkenedBg = await sharp(imageBuffer)
      .modulate({ brightness: 0.25 })
      .ensureAlpha()
      .toBuffer();
    const translucentSlide = await sharp(slideBuffer)
      .ensureAlpha()
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(255 * 0.8)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      }])
      .toBuffer();
    await sharp(darkenedBg)
      .composite([{ input: translucentSlide, blend: 'over' }])
      .toFile(outputPath);
  } else if (placement === 'overlay') {
    // Image as semi-transparent overlay on slide
    const fadedImage = await sharp(imageBuffer)
      .ensureAlpha(opacity)
      .toBuffer();
    await sharp(slideBuffer)
      .composite([{ input: fadedImage, blend: 'over' }])
      .toFile(outputPath);
  } else if (placement === 'fullscreen') {
    // Image IS the slide, with slight darkening for text readability
    const darkenedImage = await sharp(imageBuffer)
      .modulate({ brightness: 0.4 })
      .ensureAlpha()
      .toBuffer();
    const translucentSlide = await sharp(slideBuffer)
      .ensureAlpha()
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(255 * 0.85)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      }])
      .toBuffer();
    await sharp(darkenedImage)
      .composite([{ input: translucentSlide, blend: 'over' }])
      .toFile(outputPath);
  } else {
    // 'side' — landscape: image on right 40%; portrait: image on TOP 40%
    if (isPortrait) {
      const imgH = Math.round(H * 0.4);
      const contentH = H - imgH;
      const topImage = await sharp(imageBuffer)
        .resize(W, imgH, { fit: 'cover' })
        .toBuffer();
      // Crop slide content to bottom portion (where the text lives)
      const slideContent = await sharp(slideBuffer)
        .extract({ left: 0, top: imgH, width: W, height: contentH })
        .toBuffer();
      // Build final: image on top, slide content on bottom
      await sharp({
        create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
      })
        .composite([
          { input: topImage, left: 0, top: 0 },
          { input: slideContent, left: 0, top: imgH },
        ])
        .png()
        .toFile(outputPath);
    } else {
      const sideW = Math.round(W * 0.4);
      const sideImage = await sharp(imageBuffer)
        .resize(sideW, H, { fit: 'cover' })
        .toBuffer();
      await sharp(slideBuffer)
        .composite([{ input: sideImage, left: W - sideW, top: 0, blend: 'over' }])
        .toFile(outputPath);
    }
  }
}

/**
 * Apply generated images to their corresponding slides.
 * Modifies slide files in-place (writes to new composited files).
 */
export async function applyImagesToSlides(
  slides: SlideImage[],
  images: GeneratedImage[],
  imageConfig: ImageConfig,
  jobDir: string,
  resolution?: { width: number; height: number }
): Promise<SlideImage[]> {
  if (images.length === 0) return slides;

  const compositedDir = path.join(jobDir, 'slides-composited');
  fs.mkdirSync(compositedDir, { recursive: true });

  const imageMap = new Map(images.map((img) => [img.sectionIndex, img]));
  const updatedSlides: SlideImage[] = [];

  for (const slide of slides) {
    const image = imageMap.get(slide.sectionIndex);
    if (image) {
      const outputPath = path.join(
        compositedDir,
        `slide-${String(slide.sectionIndex).padStart(3, '0')}.png`
      );
      await compositeImageOnSlide(
        slide.filePath,
        image.filePath,
        imageConfig.placement,
        imageConfig.overlayOpacity,
        outputPath,
        resolution
      );
      updatedSlides.push({ ...slide, filePath: outputPath });
    } else {
      updatedSlides.push(slide);
    }
  }

  return updatedSlides;
}

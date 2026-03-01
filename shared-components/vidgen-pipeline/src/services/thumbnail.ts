import sharp from 'sharp';
import * as path from 'path';
import { config } from '../config';

/**
 * Create a YouTube-ready thumbnail from the title slide.
 * Enhances brightness, saturation, and sharpness, then resizes to 1280x720.
 */
export async function generateThumbnail(
  titleSlidePath: string,
  jobDir: string,
  resolution?: { width: number; height: number }
): Promise<string> {
  const thumbW = resolution?.width ?? config.thumbnailWidth;
  const thumbH = resolution?.height ?? config.thumbnailHeight;
  const outputPath = path.join(jobDir, 'thumbnail.jpg');

  await sharp(titleSlidePath)
    .resize(thumbW, thumbH, {
      fit: 'cover',
    })
    .modulate({
      brightness: 1.1,
      saturation: 1.3,
    })
    .sharpen({ sigma: 1.5 })
    .jpeg({ quality: 90 })
    .toFile(outputPath);

  return outputPath;
}

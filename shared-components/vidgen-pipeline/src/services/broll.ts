import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { execSync } from 'child_process';
import { config } from '../config';
import { BRollConfig, ScriptSection, BRollClip } from '../types';

/**
 * Build a search query from a script section for stock video lookup.
 */
function buildSearchQuery(section: ScriptSection): string {
  // Extract the slide title as the primary search term
  const data = section.slideData as any;
  const title = data.title || '';
  // Clean up: remove "Tip #N:", numbers, special chars
  return title
    .replace(/Tip\s*#?\d+:?\s*/i, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
}

/**
 * Search Pexels for a stock video matching the query.
 */
async function searchPexelsVideo(
  query: string,
  brollConfig: BRollConfig
): Promise<{ url: string; width: number; height: number; attribution: string; sourceUrl: string } | null> {
  const apiKey = config.pexelsApiKey;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    query,
    orientation: brollConfig.orientation,
    size: 'large',
    per_page: '5',
  });

  return new Promise((resolve, reject) => {
    https.get(
      `https://api.pexels.com/videos/search?${params}`,
      {
        headers: { Authorization: apiKey },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.warn(`  Pexels API ${res.statusCode}: ${data.slice(0, 200)}`);
            resolve(null);
            return;
          }
          const json = JSON.parse(data);
          if (!json.videos || json.videos.length === 0) {
            resolve(null);
            return;
          }

          // Find the best video file (closest to target width, HD quality)
          for (const video of json.videos) {
            const hdFile = video.video_files.find(
              (f: any) => f.width >= brollConfig.minWidth && f.quality === 'hd'
            );
            const anyFile = video.video_files.find(
              (f: any) => f.width >= 1280
            );
            const file = hdFile || anyFile || video.video_files[0];
            if (file) {
              resolve({
                url: file.link,
                width: file.width,
                height: file.height,
                attribution: `Video by ${video.user.name} on Pexels`,
                sourceUrl: video.url,
              });
              return;
            }
          }
          resolve(null);
        });
      }
    ).on('error', () => resolve(null));
  });
}

/**
 * Download a video file from URL.
 */
function downloadVideo(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doGet = (targetUrl: string) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          doGet(res.headers.location!);
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    };
    doGet(url);
  });
}

/**
 * Trim a video to the desired clip duration using FFmpeg.
 */
function trimVideo(inputPath: string, outputPath: string, maxDuration: number, W = 1920, H = 1080): void {
  execSync(
    `ffmpeg -y -i "${inputPath}" -t ${maxDuration} -c:v libx264 -preset fast -crf 23 -an -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p" "${outputPath}"`,
    { encoding: 'utf-8', timeout: 60000, stdio: 'pipe' }
  );
}

/**
 * Determine which sections should get B-roll clips.
 */
function selectSectionsForBRoll(
  sections: ScriptSection[],
  frequency: number
): ScriptSection[] {
  const content = sections.filter(
    (s) => s.slideType !== 'title' && s.slideType !== 'cta'
  );
  if (frequency <= 0) return [];
  return content.filter((_, i) => i % frequency === 0);
}

/**
 * Fetch B-roll clips for selected script sections.
 */
export async function fetchBRollClips(
  sections: ScriptSection[],
  brollConfig: BRollConfig,
  jobDir: string,
  resolution?: { width: number; height: number }
): Promise<BRollClip[]> {
  if (!brollConfig.enabled || !config.pexelsApiKey) {
    return [];
  }
  const W = resolution?.width ?? 1920;
  const H = resolution?.height ?? 1080;

  const brollDir = path.join(jobDir, 'broll');
  fs.mkdirSync(brollDir, { recursive: true });

  const targetSections = selectSectionsForBRoll(sections, brollConfig.frequency);
  const results: BRollClip[] = [];

  for (const section of targetSections) {
    const query = buildSearchQuery(section);
    if (!query) continue;

    console.log(
      `  Searching B-roll for section ${section.sectionIndex}: "${query}"`
    );

    try {
      const result = await searchPexelsVideo(query, brollConfig);
      if (!result) {
        console.warn(`  No B-roll found for "${query}"`);
        continue;
      }

      const rawPath = path.join(
        brollDir,
        `raw-${String(section.sectionIndex).padStart(3, '0')}.mp4`
      );
      const clipPath = path.join(
        brollDir,
        `clip-${String(section.sectionIndex).padStart(3, '0')}.mp4`
      );

      await downloadVideo(result.url, rawPath);
      trimVideo(rawPath, clipPath, brollConfig.clipDuration, W, H);

      // Get actual duration after trimming
      const probeResult = execSync(
        `ffprobe -v quiet -print_format json -show_format "${clipPath}"`,
        { encoding: 'utf-8' }
      );
      const duration = parseFloat(JSON.parse(probeResult).format.duration);

      results.push({
        sectionIndex: section.sectionIndex,
        filePath: clipPath,
        duration,
        query,
        sourceUrl: result.sourceUrl,
        attribution: result.attribution,
      });

      // Clean up raw download
      fs.unlinkSync(rawPath);
    } catch (err: any) {
      console.warn(
        `  Warning: B-roll fetch failed for section ${section.sectionIndex}: ${err.message}`
      );
    }
  }

  // Save manifest with attributions
  fs.writeFileSync(
    path.join(brollDir, 'manifest.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

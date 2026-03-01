import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { execSync } from 'child_process';
import { config } from '../config';
import { MusicConfig, MusicTrack } from '../types';

/**
 * Search Pixabay for royalty-free background music.
 */
async function searchPixabayMusic(
  mood: string,
  genre: string
): Promise<{ url: string; title: string; user: string } | null> {
  const apiKey = config.pixabayApiKey;
  if (!apiKey) return null;

  const query = encodeURIComponent(`${mood} ${genre}`);
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${query}&safesearch=true&category=music&per_page=5&order=popular`;

  return new Promise((resolve, reject) => {
    // Pixabay API uses plain HTTP for music search, HTTPS for everything else
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.warn(`  Pixabay API ${res.statusCode}: ${data.slice(0, 200)}`);
          resolve(null);
          return;
        }
        try {
          const json = JSON.parse(data);
          // Pixabay image API doesn't directly serve audio — use their audio endpoint
          // For now, check if hits exist
          if (json.hits && json.hits.length > 0) {
            // Pixabay standard API returns images, not audio
            // Audio requires the /api/audio/ endpoint (or direct search on site)
            resolve(null);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Generate a simple ambient background track using FFmpeg synthesis.
 * Creates a gentle sine-wave pad as fallback when no music API is available.
 */
function generateAmbientTrack(
  outputPath: string,
  durationSec: number,
  mood: string
): void {
  // Different tones for different moods
  const tones: Record<string, { freq: number; freq2: number }> = {
    calm: { freq: 220, freq2: 330 },
    corporate: { freq: 261, freq2: 392 },
    energetic: { freq: 329, freq2: 440 },
    epic: { freq: 196, freq2: 293 },
    dramatic: { freq: 185, freq2: 277 },
  };
  const t = tones[mood] || tones.calm;

  // Generate a gentle two-tone ambient pad using separate lavfi inputs
  execSync(
    `ffmpeg -y -f lavfi -i "sine=frequency=${t.freq}:duration=${durationSec}" -f lavfi -i "sine=frequency=${t.freq2}:duration=${durationSec}" -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest,lowpass=f=800,volume=1.0[out]" -map "[out]" -c:a libmp3lame -q:a 6 "${outputPath}"`,
    { encoding: 'utf-8', timeout: 30000, stdio: 'pipe' }
  );
}

/**
 * Get or generate a background music track for the video.
 * Priority: user file > Pixabay API > generated ambient tone.
 */
export async function getBackgroundMusic(
  musicConfig: MusicConfig,
  videoDurationSec: number,
  jobDir: string
): Promise<MusicTrack | null> {
  if (!musicConfig.enabled) return null;

  const musicDir = path.join(jobDir, 'music');
  fs.mkdirSync(musicDir, { recursive: true });

  // Option 1: User-provided file
  if (musicConfig.provider === 'file' && musicConfig.filePath) {
    const resolvedPath = path.resolve(musicConfig.filePath);
    if (fs.existsSync(resolvedPath)) {
      const trimmedPath = path.join(musicDir, 'background.mp3');
      // Trim/loop to match video duration
      execSync(
        `ffmpeg -y -stream_loop -1 -i "${resolvedPath}" -t ${videoDurationSec} -c:a libmp3lame -q:a 4 "${trimmedPath}"`,
        { encoding: 'utf-8', timeout: 60000, stdio: 'pipe' }
      );
      const probeResult = execSync(
        `ffprobe -v quiet -print_format json -show_format "${trimmedPath}"`,
        { encoding: 'utf-8' }
      );
      return {
        filePath: trimmedPath,
        duration: parseFloat(JSON.parse(probeResult).format.duration),
        title: path.basename(resolvedPath),
        attribution: 'User-provided',
      };
    }
  }

  // Option 2: Bundled asset (pre-generated, higher quality than lavfi)
  const bundledPath = path.resolve(__dirname, '../../assets/music', `${musicConfig.mood}.mp3`);
  if (fs.existsSync(bundledPath)) {
    console.log(`  Using bundled music asset (${musicConfig.mood})...`);
    const trimmedPath = path.join(musicDir, 'background.mp3');
    execSync(
      `ffmpeg -y -stream_loop -1 -i "${bundledPath}" -t ${videoDurationSec} -c:a libmp3lame -q:a 4 "${trimmedPath}"`,
      { encoding: 'utf-8', timeout: 60000, stdio: 'pipe' }
    );
    const probeResult = execSync(
      `ffprobe -v quiet -print_format json -show_format "${trimmedPath}"`,
      { encoding: 'utf-8' }
    );
    return {
      filePath: trimmedPath,
      duration: parseFloat(JSON.parse(probeResult).format.duration),
      title: `Bundled ${musicConfig.mood}`,
      attribution: 'Bundled asset (FFmpeg generated)',
    };
  }

  // Option 3: Pixabay API (if key available)
  // Note: Pixabay's free API doesn't have a dedicated audio endpoint in the standard tier.
  // This would need their newer Audio API or a different provider.
  // Falling through to generated ambient.

  // Option 4: Generate ambient track (lavfi fallback)
  console.log(`  Generating ambient background music (${musicConfig.mood})...`);
  const ambientPath = path.join(musicDir, 'background.mp3');
  generateAmbientTrack(ambientPath, videoDurationSec, musicConfig.mood);

  const probeResult = execSync(
    `ffprobe -v quiet -print_format json -show_format "${ambientPath}"`,
    { encoding: 'utf-8' }
  );

  return {
    filePath: ambientPath,
    duration: parseFloat(JSON.parse(probeResult).format.duration),
    title: `Generated ${musicConfig.mood} ambient`,
    attribution: 'Auto-generated',
  };
}

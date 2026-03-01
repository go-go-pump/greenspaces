import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SFXConfig, AudioClip } from '../types';

/**
 * Generate a short transition "swoosh" sound using FFmpeg synthesis.
 * Frequency sweep from high to low with fast decay.
 */
function generateTransitionSwoosh(outputPath: string): void {
  // 0.3s descending frequency sweep (44100*0.7 = 30870)
  execSync(
    `ffmpeg -y -f lavfi -i "sine=frequency=1200:duration=0.3,asetrate=30870,aresample=44100,afade=t=out:st=0.1:d=0.2" -c:a libmp3lame -q:a 4 "${outputPath}"`,
    { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
  );
}

/**
 * Generate an intro sting (short ascending tone).
 */
function generateIntroSting(outputPath: string): void {
  // 44100*1.3 = 57330
  execSync(
    `ffmpeg -y -f lavfi -i "sine=frequency=400:duration=0.8,afade=t=in:st=0:d=0.1,afade=t=out:st=0.5:d=0.3,asetrate=57330,aresample=44100" -c:a libmp3lame -q:a 4 "${outputPath}"`,
    { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
  );
}

/**
 * Generate an outro sting (descending tone with reverb feel).
 */
function generateOutroSting(outputPath: string): void {
  // 44100*0.8 = 35280
  execSync(
    `ffmpeg -y -f lavfi -i "sine=frequency=600:duration=1.2,afade=t=in:st=0:d=0.05,afade=t=out:st=0.3:d=0.9,asetrate=35280,aresample=44100" -c:a libmp3lame -q:a 4 "${outputPath}"`,
    { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
  );
}

export interface SFXAssets {
  transitionPath: string | null;
  introPath: string | null;
  outroPath: string | null;
}

/**
 * Generate all needed SFX assets for the video.
 */
export function generateSFXAssets(
  sfxConfig: SFXConfig,
  jobDir: string
): SFXAssets {
  if (!sfxConfig.enabled) {
    return { transitionPath: null, introPath: null, outroPath: null };
  }

  const sfxDir = path.join(jobDir, 'sfx');
  fs.mkdirSync(sfxDir, { recursive: true });

  let transitionPath: string | null = null;
  let introPath: string | null = null;
  let outroPath: string | null = null;

  // Check for bundled assets before generating via lavfi
  const bundledDir = path.resolve(__dirname, '../../assets/sfx');

  if (sfxConfig.transitionSound) {
    transitionPath = path.join(sfxDir, 'transition.mp3');
    const bundledTransition = path.join(bundledDir, 'transition.mp3');
    if (fs.existsSync(bundledTransition)) {
      fs.copyFileSync(bundledTransition, transitionPath);
      console.log('  Using bundled transition SFX');
    } else {
      generateTransitionSwoosh(transitionPath);
      console.log('  Generated transition swoosh SFX (lavfi fallback)');
    }
  }

  if (sfxConfig.introSting) {
    introPath = path.join(sfxDir, 'intro.mp3');
    const bundledIntro = path.join(bundledDir, 'intro.mp3');
    if (fs.existsSync(bundledIntro)) {
      fs.copyFileSync(bundledIntro, introPath);
      console.log('  Using bundled intro SFX');
    } else {
      generateIntroSting(introPath);
      console.log('  Generated intro sting SFX (lavfi fallback)');
    }
  }

  if (sfxConfig.outroSting) {
    outroPath = path.join(sfxDir, 'outro.mp3');
    const bundledOutro = path.join(bundledDir, 'outro.mp3');
    if (fs.existsSync(bundledOutro)) {
      fs.copyFileSync(bundledOutro, outroPath);
      console.log('  Using bundled outro SFX');
    } else {
      generateOutroSting(outroPath);
      console.log('  Generated outro sting SFX (lavfi fallback)');
    }
  }

  return { transitionPath, introPath, outroPath };
}

/**
 * Build a timeline of SFX events placed at the right moments in the video.
 * Returns FFmpeg filter-compatible delay values for each SFX instance.
 */
export function buildSFXTimeline(
  audioClips: AudioClip[],
  sfxAssets: SFXAssets
): { path: string; startMs: number }[] {
  const events: { path: string; startMs: number }[] = [];

  // Intro sting at 0ms
  if (sfxAssets.introPath) {
    events.push({ path: sfxAssets.introPath, startMs: 0 });
  }

  // Transition swoosh at each slide change
  if (sfxAssets.transitionPath) {
    let cumulativeMs = 0;
    for (let i = 0; i < audioClips.length - 1; i++) {
      cumulativeMs += audioClips[i].duration * 1000;
      events.push({
        path: sfxAssets.transitionPath,
        startMs: Math.max(0, cumulativeMs - 150), // slightly before transition
      });
    }
  }

  // Outro sting at end
  if (sfxAssets.outroPath) {
    const totalMs = audioClips.reduce((s, c) => s + c.duration * 1000, 0);
    events.push({
      path: sfxAssets.outroPath,
      startMs: Math.max(0, totalMs - 1500),
    });
  }

  return events;
}

import { execSync } from 'child_process';
import * as path from 'path';
import { MusicConfig, SFXConfig, MusicTrack, AudioClip } from '../types';
import { SFXAssets, buildSFXTimeline } from './sfx';

export interface MixResult {
  filePath: string;
  duration: number;
}

/**
 * Mix multiple audio tracks into a single output using FFmpeg.
 *
 * Tracks:
 * 1. Voice narration (full volume, primary)
 * 2. Background music (ducked under voice, faded in/out)
 * 3. SFX events (placed at specific timestamps)
 *
 * Uses FFmpeg's filter_complex for multi-input mixing with:
 * - Volume ducking (sidechaincompress or simple volume)
 * - Fade in/out on music
 * - Delay-based SFX placement
 * - Peak limiting via dynaudnorm
 */
export function mixAudioTracks(
  voicePath: string,
  musicTrack: MusicTrack | null,
  musicConfig: MusicConfig,
  sfxAssets: SFXAssets,
  sfxConfig: SFXConfig,
  audioClips: AudioClip[],
  jobDir: string
): MixResult {
  const outputPath = path.join(jobDir, 'mixed-audio.mp3');

  // Get voice duration
  const probeResult = execSync(
    `ffprobe -v quiet -print_format json -show_format "${voicePath}"`,
    { encoding: 'utf-8' }
  );
  const voiceDuration = parseFloat(JSON.parse(probeResult).format.duration);

  // If no music and no SFX, just return the voice as-is
  if (!musicTrack && !sfxAssets.transitionPath && !sfxAssets.introPath && !sfxAssets.outroPath) {
    return { filePath: voicePath, duration: voiceDuration };
  }

  // Build FFmpeg command with filter_complex
  const inputs: string[] = [`-i "${voicePath}"`];
  const filterParts: string[] = [];
  const mixInputs: string[] = ['[voice]'];
  let inputIdx = 1;

  // Voice: normalize volume
  filterParts.push(`[0:a]volume=1.0[voice]`);

  // Music track
  if (musicTrack) {
    inputs.push(`-i "${musicTrack.filePath}"`);
    const musicFilterChain = [
      `volume=${musicConfig.volume}`,
      `afade=t=in:st=0:d=${musicConfig.fadeInSec}`,
      `afade=t=out:st=${Math.max(0, voiceDuration - musicConfig.fadeOutSec)}:d=${musicConfig.fadeOutSec}`,
    ].join(',');
    filterParts.push(`[${inputIdx}:a]${musicFilterChain}[music]`);
    mixInputs.push('[music]');
    inputIdx++;
  }

  // SFX events
  const sfxEvents = buildSFXTimeline(audioClips, sfxAssets);
  if (sfxEvents.length > 0) {
    // Add each unique SFX file as an input
    const sfxFileMap = new Map<string, number>();
    for (const evt of sfxEvents) {
      if (!sfxFileMap.has(evt.path)) {
        inputs.push(`-i "${evt.path}"`);
        sfxFileMap.set(evt.path, inputIdx);
        inputIdx++;
      }
    }

    // Create delayed instances and mix them together
    const sfxParts: string[] = [];
    sfxEvents.forEach((evt, i) => {
      const srcIdx = sfxFileMap.get(evt.path)!;
      const label = `sfx${i}`;
      filterParts.push(
        `[${srcIdx}:a]adelay=${evt.startMs}|${evt.startMs},volume=${sfxConfig.volume}[${label}]`
      );
      sfxParts.push(`[${label}]`);
    });

    // Mix all SFX into one stream
    if (sfxParts.length === 1) {
      filterParts.push(`${sfxParts[0]}acopy[sfxmix]`);
    } else {
      filterParts.push(
        `${sfxParts.join('')}amix=inputs=${sfxParts.length}:duration=longest:dropout_transition=0:normalize=0[sfxmix]`
      );
    }
    mixInputs.push('[sfxmix]');
  }

  // Final mix: combine all streams
  if (mixInputs.length === 1) {
    // Just voice, but we still want normalization
    filterParts.push(`[voice]dynaudnorm=p=0.9:s=5[out]`);
  } else {
    filterParts.push(
      `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=0:normalize=0,dynaudnorm=p=0.9:s=5[out]`
    );
  }

  const filterComplex = filterParts.join(';');

  const cmd = [
    'ffmpeg -y',
    inputs.join(' '),
    `-filter_complex "${filterComplex}"`,
    '-map "[out]"',
    '-c:a libmp3lame -q:a 2',
    `"${outputPath}"`,
  ].join(' ');

  execSync(cmd, {
    encoding: 'utf-8',
    timeout: 120000,
    stdio: 'pipe',
  });

  // Get output duration
  const outProbe = execSync(
    `ffprobe -v quiet -print_format json -show_format "${outputPath}"`,
    { encoding: 'utf-8' }
  );
  const outDuration = parseFloat(JSON.parse(outProbe).format.duration);

  return { filePath: outputPath, duration: outDuration };
}

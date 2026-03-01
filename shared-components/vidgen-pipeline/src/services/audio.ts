import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { PROFESSIONAL_VOICE } from '../presets/voices';
import { VoiceProfile, ScriptSection, AudioClip, AudioResult } from '../types';

/**
 * Get duration of an audio file in seconds using ffprobe.
 */
function getAudioDuration(filePath: string): number {
  const result = execSync(
    `ffprobe -v quiet -print_format json -show_format "${filePath}"`,
    { encoding: 'utf-8' }
  );
  const info = JSON.parse(result);
  return parseFloat(info.format.duration);
}

const FALLBACK_VOICE = 'en-US-GuyNeural';

/**
 * Generate audio for a single section using edge-tts (free Microsoft TTS).
 * Falls back to GuyNeural if the configured voice is unavailable.
 */
function generateEdgeTts(
  text: string,
  outputPath: string,
  voice: VoiceProfile
): void {
  // Escape single quotes and newlines for shell safety
  const safeText = text.replace(/'/g, "'\\''").replace(/\n/g, ' ');
  const rateFlag = voice.edgeTtsRate !== '+0%' ? `--rate="${voice.edgeTtsRate}"` : '';

  try {
    execSync(
      `python3 -m edge_tts --text '${safeText}' --voice "${voice.edgeTtsVoice}" ${rateFlag} --write-media "${outputPath}"`,
      { encoding: 'utf-8', timeout: 60000 }
    );
  } catch (err: any) {
    if (voice.edgeTtsVoice !== FALLBACK_VOICE && err.message?.includes('NoAudioReceived')) {
      console.warn(`  Voice "${voice.edgeTtsVoice}" unavailable, falling back to ${FALLBACK_VOICE}`);
      execSync(
        `python3 -m edge_tts --text '${safeText}' --voice "${FALLBACK_VOICE}" ${rateFlag} --write-media "${outputPath}"`,
        { encoding: 'utf-8', timeout: 60000 }
      );
    } else {
      throw err;
    }
  }
}

/**
 * Generate audio for all script sections and combine into one file.
 */
export async function generateAudio(
  sections: ScriptSection[],
  jobDir: string,
  voice: VoiceProfile = PROFESSIONAL_VOICE
): Promise<AudioResult> {
  const audioDir = path.join(jobDir, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });

  const clips: AudioClip[] = [];

  // Generate per-section audio
  for (const section of sections) {
    const clipPath = path.join(
      audioDir,
      `section-${String(section.sectionIndex).padStart(3, '0')}.mp3`
    );

    console.log(
      `  Generating audio for section ${section.sectionIndex}: ${section.slideType}`
    );

    if (config.ttsProvider === 'edge-tts') {
      generateEdgeTts(section.narrationText, clipPath, voice);
    } else {
      throw new Error(
        'ElevenLabs TTS not yet implemented. Use TTS_PROVIDER=edge-tts'
      );
    }

    const duration = getAudioDuration(clipPath);
    clips.push({
      sectionIndex: section.sectionIndex,
      filePath: clipPath,
      duration,
    });
  }

  // Concatenate all clips using FFmpeg concat demuxer
  const concatListPath = path.join(audioDir, 'concat-list.txt');
  const concatContent = clips
    .map((c) => `file '${c.filePath}'`)
    .join('\n');
  fs.writeFileSync(concatListPath, concatContent);

  const combinedPath = path.join(jobDir, 'narration.mp3');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${combinedPath}"`,
    { encoding: 'utf-8', timeout: 120000 }
  );

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

  return {
    clips,
    combinedFilePath: combinedPath,
    totalDuration,
  };
}

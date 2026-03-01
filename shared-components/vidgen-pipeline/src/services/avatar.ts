import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { execSync } from 'child_process';
import { config } from '../config';
import { AvatarConfig, ScriptSection, AvatarClip, AudioClip } from '../types';

/** Enriched result when avatar generates audio too */
export interface AvatarResult {
  clips: AvatarClip[];
  audioClips: AudioClip[];
  combinedAudioPath: string;
  totalDuration: number;
}

/** Tracks a submitted HeyGen job while we wait for it */
interface PendingJob {
  sectionIndex: number;
  videoId: string;
  clipPath: string;
}

/**
 * Make an HTTPS request to HeyGen API.
 */
function heygenRequest(
  method: string,
  apiPath: string,
  body?: any
): Promise<any> {
  const apiKey = config.heygenApiKey;
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: 'api.heygen.com',
      path: apiPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HeyGen API ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        resolve(JSON.parse(data));
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Download a file from URL to local path, following redirects.
 */
function downloadFile(url: string, dest: string): Promise<void> {
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
 * Probe actual duration of a media file via ffprobe.
 */
function probeDuration(filePath: string): number {
  const raw = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: 'utf-8', timeout: 10000 }
  ).trim();
  const dur = parseFloat(raw);
  return isNaN(dur) ? 0 : dur;
}

/**
 * Extract audio track from a video file.
 */
function extractAudio(videoPath: string, audioPath: string): void {
  execSync(
    `ffmpeg -y -i "${videoPath}" -vn -acodec libmp3lame -q:a 4 "${audioPath}"`,
    { encoding: 'utf-8', timeout: 30000, stdio: 'pipe' }
  );
}

/**
 * Generate avatar video clips for script sections.
 *
 * Strategy: submit ALL HeyGen jobs upfront, then long-poll them all in a
 * single loop until every job completes (or fails). This lets HeyGen process
 * clips in parallel on their end instead of sequentially timing out.
 *
 * When useAvatarVoice is true, generates clips for ALL sections (including
 * title/CTA) to provide consistent voice throughout. Audio is extracted from
 * each clip and concatenated into a single narration file.
 */
export async function generateAvatarClips(
  sections: ScriptSection[],
  avatarConfig: AvatarConfig,
  jobDir: string
): Promise<AvatarResult> {
  const emptyResult: AvatarResult = {
    clips: [], audioClips: [], combinedAudioPath: '', totalDuration: 0,
  };

  if (!avatarConfig.enabled || !config.heygenApiKey || !avatarConfig.avatarId) {
    return emptyResult;
  }

  const avatarDir = path.join(jobDir, 'avatar');
  fs.mkdirSync(avatarDir, { recursive: true });

  const useVoice = avatarConfig.useAvatarVoice && !!avatarConfig.voiceId;

  // ── Phase 1: Submit all jobs to HeyGen ──
  const pendingJobs: PendingJob[] = [];
  const failedSections: number[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // When NOT using avatar voice, skip title and CTA (original behavior)
    if (!useVoice && (section.slideType === 'title' || section.slideType === 'cta')) {
      continue;
    }

    // Rotate through look IDs round-robin, falling back to base avatarId
    const avatarId = avatarConfig.lookIds.length > 0
      ? avatarConfig.lookIds[i % avatarConfig.lookIds.length]
      : avatarConfig.avatarId;

    // Voice settings
    const voiceSettings = useVoice
      ? { type: 'text', voice_id: avatarConfig.voiceId, input_text: section.narrationText }
      : { type: 'text', voice_id: 'en-US-GuyNeural', input_text: section.narrationText };

    const clipPath = path.join(
      avatarDir,
      `avatar-${String(section.sectionIndex).padStart(3, '0')}.mp4`
    );

    try {
      console.log(
        `  Submitting avatar job for section ${section.sectionIndex}: ${section.slideType}`
      );

      const createResponse = await heygenRequest('POST', '/v2/video/generate', {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: avatarId,
              avatar_style: 'normal',
            },
            voice: voiceSettings,
            background: {
              type: 'color',
              value: '#00FF00', // Green screen for compositing
            },
          },
        ],
        dimension: { width: 480, height: 480 },
      });

      const videoId = createResponse.data?.video_id;
      if (!videoId) {
        throw new Error('No video_id returned from HeyGen');
      }

      pendingJobs.push({ sectionIndex: section.sectionIndex, videoId, clipPath });
    } catch (err: any) {
      console.error(
        `  ERROR: Failed to submit job for section ${section.sectionIndex}: ${err.message}`
      );
      failedSections.push(section.sectionIndex);
      // If the very first submission fails, likely all will (bad auth, avatar ID, etc.)
      if (pendingJobs.length === 0 && i === 0) {
        console.error('  Aborting — first submission failed (check avatar ID and API key)');
        return emptyResult;
      }
    }
  }

  if (pendingJobs.length === 0) {
    return emptyResult;
  }

  console.log(`  Submitted ${pendingJobs.length} jobs — polling for completion...`);

  // ── Phase 2: Long-poll all jobs until resolved ──
  const maxWaitMs = 600000; // 10 minutes total for the entire batch
  const pollIntervalMs = 10000; // check every 10s
  const start = Date.now();

  const completedJobs = new Map<number, string>(); // sectionIndex → videoUrl
  const remainingJobs = new Set(pendingJobs.map(j => j.sectionIndex));

  while (remainingJobs.size > 0 && (Date.now() - start) < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    // Check all remaining jobs in parallel
    const checks = pendingJobs
      .filter(j => remainingJobs.has(j.sectionIndex))
      .map(async (job) => {
        try {
          const status = await heygenRequest(
            'GET',
            `/v1/video_status.get?video_id=${job.videoId}`
          );

          if (status.data?.status === 'completed') {
            completedJobs.set(job.sectionIndex, status.data.video_url);
            remainingJobs.delete(job.sectionIndex);
            console.log(`  ✓ Section ${job.sectionIndex} ready`);
          } else if (status.data?.status === 'failed') {
            remainingJobs.delete(job.sectionIndex);
            failedSections.push(job.sectionIndex);
            console.error(`  ✗ Section ${job.sectionIndex} failed: ${status.data.error || 'unknown'}`);
          }
          // else still processing — keep polling
        } catch (err: any) {
          // Transient poll error — don't remove, try again next cycle
          console.error(`  Poll error for section ${job.sectionIndex}: ${err.message}`);
        }
      });

    await Promise.all(checks);

    const elapsed = Math.round((Date.now() - start) / 1000);
    if (remainingJobs.size > 0) {
      console.log(`  Waiting... ${completedJobs.size} done, ${remainingJobs.size} pending (${elapsed}s elapsed)`);
    }
  }

  // Any jobs still remaining after timeout — save checkpoint instead of marking failed
  if (remainingJobs.size > 0) {
    console.log(`  ${remainingJobs.size} jobs still processing after ${Math.round(maxWaitMs / 1000)}s — saving checkpoint for resume`);
  }

  // ── Phase 3: Download completed clips, extract audio ──
  const clips: AvatarClip[] = [];
  const audioClips: AudioClip[] = [];

  // Sort by section index to maintain order
  const sortedJobs = pendingJobs
    .filter(j => completedJobs.has(j.sectionIndex))
    .sort((a, b) => a.sectionIndex - b.sectionIndex);

  for (const job of sortedJobs) {
    const videoUrl = completedJobs.get(job.sectionIndex)!;

    try {
      console.log(`  Downloading section ${job.sectionIndex}...`);
      await downloadFile(videoUrl, job.clipPath);

      const duration = probeDuration(job.clipPath);

      clips.push({
        sectionIndex: job.sectionIndex,
        filePath: job.clipPath,
        duration,
      });

      if (useVoice) {
        const audioPath = job.clipPath.replace('.mp4', '.mp3');
        extractAudio(job.clipPath, audioPath);
        audioClips.push({
          sectionIndex: job.sectionIndex,
          filePath: audioPath,
          duration,
        });
      }
    } catch (err: any) {
      console.error(
        `  ERROR: Download/extract failed for section ${job.sectionIndex}: ${err.message}`
      );
      failedSections.push(job.sectionIndex);
    }
  }

  console.log(`  Completed: ${clips.length}/${pendingJobs.length} clips (${failedSections.length} failed)`);

  // ── Phase 4: Concatenate audio ──
  let combinedAudioPath = '';
  let totalDuration = 0;

  if (useVoice && audioClips.length > 0) {
    const concatListPath = path.join(avatarDir, 'audio-concat.txt');
    fs.writeFileSync(
      concatListPath,
      audioClips.map(c => `file '${c.filePath}'`).join('\n')
    );
    combinedAudioPath = path.join(avatarDir, 'narration.mp3');
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:a libmp3lame -q:a 4 "${combinedAudioPath}"`,
      { encoding: 'utf-8', timeout: 60000, stdio: 'pipe' }
    );
    totalDuration = audioClips.reduce((sum, c) => sum + c.duration, 0);
  }

  // Save manifest
  fs.writeFileSync(
    path.join(avatarDir, 'manifest.json'),
    JSON.stringify({ clips, audioClips, combinedAudioPath, totalDuration, failedSections }, null, 2)
  );

  // Save checkpoint for pending jobs so they can be resumed later
  if (remainingJobs.size > 0) {
    const checkpointData = {
      pendingJobs: pendingJobs.filter(j => remainingJobs.has(j.sectionIndex)),
      completedClips: clips,
      completedAudioClips: audioClips,
      useVoice,
    };
    fs.writeFileSync(
      path.join(jobDir, 'avatar-checkpoint.json'),
      JSON.stringify(checkpointData, null, 2)
    );
    console.log(`  Saved avatar checkpoint with ${remainingJobs.size} pending jobs`);
  }

  return { clips, audioClips, combinedAudioPath, totalDuration };
}

/**
 * Resume avatar clip generation from a checkpoint.
 *
 * Reads avatar-checkpoint.json, polls all pending HeyGen jobs once,
 * downloads any that are now completed, merges with previously completed
 * clips, and returns the full result.
 */
export async function resumeAvatarClips(
  jobDir: string,
  avatarConfig: AvatarConfig
): Promise<{ result: AvatarResult; stillPending: number }> {
  const checkpointPath = path.join(jobDir, 'avatar-checkpoint.json');
  if (!fs.existsSync(checkpointPath)) {
    throw new Error('No avatar-checkpoint.json found — nothing to resume');
  }

  const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8')) as {
    pendingJobs: PendingJob[];
    completedClips: AvatarClip[];
    completedAudioClips: AudioClip[];
    useVoice: boolean;
  };

  const avatarDir = path.join(jobDir, 'avatar');
  fs.mkdirSync(avatarDir, { recursive: true });

  const clips = [...checkpoint.completedClips];
  const audioClips = [...checkpoint.completedAudioClips];
  const stillPendingJobs: PendingJob[] = [];
  const failedSections: number[] = [];

  console.log(`  Checking ${checkpoint.pendingJobs.length} pending HeyGen jobs...`);

  // Poll all pending jobs once
  for (const job of checkpoint.pendingJobs) {
    try {
      const status = await heygenRequest(
        'GET',
        `/v1/video_status.get?video_id=${job.videoId}`
      );

      if (status.data?.status === 'completed') {
        console.log(`  ✓ Section ${job.sectionIndex} ready — downloading...`);
        await downloadFile(status.data.video_url, job.clipPath);

        const duration = probeDuration(job.clipPath);
        clips.push({
          sectionIndex: job.sectionIndex,
          filePath: job.clipPath,
          duration,
        });

        if (checkpoint.useVoice) {
          const audioPath = job.clipPath.replace('.mp4', '.mp3');
          extractAudio(job.clipPath, audioPath);
          audioClips.push({
            sectionIndex: job.sectionIndex,
            filePath: audioPath,
            duration,
          });
        }
      } else if (status.data?.status === 'failed') {
        console.error(`  ✗ Section ${job.sectionIndex} failed: ${status.data.error || 'unknown'}`);
        failedSections.push(job.sectionIndex);
      } else {
        console.log(`  ⏳ Section ${job.sectionIndex} still processing`);
        stillPendingJobs.push(job);
      }
    } catch (err: any) {
      console.error(`  Poll error for section ${job.sectionIndex}: ${err.message}`);
      stillPendingJobs.push(job); // Keep it for next resume attempt
    }
  }

  // Sort clips by section index
  clips.sort((a, b) => a.sectionIndex - b.sectionIndex);
  audioClips.sort((a, b) => a.sectionIndex - b.sectionIndex);

  // Rebuild combined audio if using avatar voice
  let combinedAudioPath = '';
  let totalDuration = 0;

  if (checkpoint.useVoice && audioClips.length > 0) {
    const concatListPath = path.join(avatarDir, 'audio-concat.txt');
    fs.writeFileSync(
      concatListPath,
      audioClips.map(c => `file '${c.filePath}'`).join('\n')
    );
    combinedAudioPath = path.join(avatarDir, 'narration.mp3');
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:a libmp3lame -q:a 4 "${combinedAudioPath}"`,
      { encoding: 'utf-8', timeout: 60000, stdio: 'pipe' }
    );
    totalDuration = audioClips.reduce((sum, c) => sum + c.duration, 0);
  }

  // Update checkpoint — either remove it or update with remaining jobs
  if (stillPendingJobs.length > 0) {
    const updatedCheckpoint = {
      pendingJobs: stillPendingJobs,
      completedClips: clips,
      completedAudioClips: audioClips,
      useVoice: checkpoint.useVoice,
    };
    fs.writeFileSync(checkpointPath, JSON.stringify(updatedCheckpoint, null, 2));
    console.log(`  ${stillPendingJobs.length} jobs still pending`);
  } else {
    // All done — remove checkpoint
    fs.unlinkSync(checkpointPath);
    console.log(`  All avatar jobs resolved — checkpoint removed`);
  }

  // Update manifest
  fs.writeFileSync(
    path.join(avatarDir, 'manifest.json'),
    JSON.stringify({ clips, audioClips, combinedAudioPath, totalDuration, failedSections }, null, 2)
  );

  const result: AvatarResult = { clips, audioClips, combinedAudioPath, totalDuration };
  return { result, stillPending: stillPendingJobs.length };
}

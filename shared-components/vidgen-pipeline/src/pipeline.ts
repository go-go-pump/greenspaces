import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { config, validateConfig, getResolution, getThumbnailResolution } from './config';
import { VideoConfig, PipelineResult, CostEstimate, Script, ScriptSection, SlideImage, AudioClip, AudioResult, CaptionConfig } from './types';
import { DEFAULT_VIDEO_CONFIG } from './presets/defaults';
import { researchTopic } from './services/research';
import { generateScript } from './services/script';
import { renderSlides } from './services/slides';
import { generateImages, applyImagesToSlides } from './services/images';
import { fetchBRollClips } from './services/broll';
import { generateAvatarClips, resumeAvatarClips, AvatarResult } from './services/avatar';
import { generateAudio } from './services/audio';
import { getBackgroundMusic } from './services/music';
import { generateSFXAssets } from './services/sfx';
import { mixAudioTracks } from './services/mixer';
import { assembleVideo } from './services/video';
import { generateCaptions } from './services/captions';
import { generateThumbnail } from './services/thumbnail';
import { generateMetadata } from './services/metadata';

function log(step: number, total: number, message: string): void {
  console.log(`\n[${step}/${total}] ${message}`);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes('rate_limit') ||
        err?.message?.includes('429');
      if (isRateLimit && attempt < maxRetries) {
        const waitSec = attempt * 30;
        console.log(
          `  Rate limited on ${label}, waiting ${waitSec}s before retry ${attempt + 1}/${maxRetries}...`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Unreachable`);
}

/**
 * Count active layers for step numbering.
 */
function countSteps(vc: VideoConfig): number {
  let steps = 7; // research, script, slides, audio, video, thumbnail, metadata
  if (vc.images.enabled && config.openaiApiKey) steps++;
  if (vc.broll.enabled && config.pexelsApiKey) steps++;
  if (vc.avatar.enabled && config.heygenApiKey) steps++;
  if (vc.music.enabled || vc.sfx.enabled) steps++; // music/sfx/mix step
  if (vc.captions.enabled && vc.aspectRatio === '9:16' && config.openaiApiKey) steps++;
  return steps;
}

export async function runPipeline(
  topic: string,
  videoConfig?: Partial<VideoConfig>
): Promise<PipelineResult> {
  validateConfig();

  // Merge user config with defaults
  const vc: VideoConfig = {
    ...DEFAULT_VIDEO_CONFIG,
    ...videoConfig,
    mode: videoConfig?.mode ?? DEFAULT_VIDEO_CONFIG.mode,
    style: videoConfig?.style ?? DEFAULT_VIDEO_CONFIG.style,
    voice: videoConfig?.voice ?? DEFAULT_VIDEO_CONFIG.voice,
    images: { ...DEFAULT_VIDEO_CONFIG.images, ...videoConfig?.images },
    broll: { ...DEFAULT_VIDEO_CONFIG.broll, ...videoConfig?.broll },
    avatar: { ...DEFAULT_VIDEO_CONFIG.avatar, ...videoConfig?.avatar },
    music: { ...DEFAULT_VIDEO_CONFIG.music, ...videoConfig?.music },
    sfx: { ...DEFAULT_VIDEO_CONFIG.sfx, ...videoConfig?.sfx },
    captions: { ...DEFAULT_VIDEO_CONFIG.captions, ...videoConfig?.captions },
  };

  const resolution = getResolution(vc.aspectRatio);
  const thumbResolution = getThumbnailResolution(vc.aspectRatio);

  // Auto-switch DALL-E image size for portrait
  if (vc.aspectRatio === '9:16' && vc.images.enabled) {
    vc.images = { ...vc.images, size: '1024x1792' };
  }

  // Auto-switch B-roll orientation for portrait
  if (vc.aspectRatio === '9:16' && vc.broll.enabled) {
    vc.broll = { ...vc.broll, orientation: 'portrait' };
  }

  const jobId = uuidv4().slice(0, 8);
  const jobDir = path.join(config.tmpDir, jobId);
  const outputDir = path.join(config.outputDir, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const totalSteps = countSteps(vc);
  let stepNum = 0;

  // Print active layers
  const layers: string[] = ['slides', 'voice'];
  if (vc.images.enabled && config.openaiApiKey) layers.push('images');
  if (vc.broll.enabled && config.pexelsApiKey) layers.push('b-roll');
  if (vc.avatar.enabled && config.heygenApiKey) layers.push('avatar');
  if (vc.music.enabled) layers.push('music');
  if (vc.sfx.enabled) layers.push('sfx');
  if (vc.captions.enabled && vc.aspectRatio === '9:16' && config.openaiApiKey) layers.push('captions');

  console.log(`\nJob ID: ${jobId}`);
  console.log(`Topic: "${topic}"`);
  console.log(`Mode: ${vc.mode} | Style: ${vc.style.name} | Voice: ${vc.voice.name} | Aspect: ${vc.aspectRatio} (${resolution.width}x${resolution.height})`);
  console.log(`Active layers: ${layers.join(', ')}`);
  console.log(`Working directory: ${jobDir}`);

  // Save config
  fs.writeFileSync(path.join(jobDir, 'config.json'), JSON.stringify(vc, null, 2));

  const timing: Record<string, number> = {};
  const cost: CostEstimate = {
    research: 0, script: 0, metadata: 0, images: 0,
    broll: 0, avatar: 0, music: 0, tts: 0, captions: 0, total: 0, currency: 'USD',
  };
  const pipelineStart = Date.now();

  // ── Step: Research ──
  log(++stepNum, totalSteps, 'Researching topic...');
  let start = Date.now();
  const research = await withRetry(() => researchTopic(topic, jobDir, vc.mode), 'research');
  timing.research = (Date.now() - start) / 1000;
  cost.research = 0.02; // ~haiku web search
  console.log(
    `  Found ${research.keyPoints.length} key points, ${research.detailedSections.length} sections (${timing.research.toFixed(1)}s)`
  );

  // ── Step: Script ──
  log(++stepNum, totalSteps, 'Generating script...');
  start = Date.now();
  const script = await withRetry(() => generateScript(research, jobDir, vc.mode), 'script');
  timing.script = (Date.now() - start) / 1000;
  cost.script = 0.08;
  console.log(
    `  Created ${script.sections.length} sections, est. ${script.totalEstimatedDuration}s (${timing.script.toFixed(1)}s)`
  );

  // ── Step: Slides ──
  log(++stepNum, totalSteps, 'Rendering slides...');
  start = Date.now();
  let slides = await renderSlides(script.sections, jobDir, vc.style, resolution);
  timing.slides = (Date.now() - start) / 1000;
  console.log(
    `  Rendered ${slides.length} slides at ${resolution.width}x${resolution.height} (${timing.slides.toFixed(1)}s)`
  );

  // ── Step: Images (Layer 2 — optional) ──
  timing.images = 0;
  if (vc.images.enabled && config.openaiApiKey) {
    log(++stepNum, totalSteps, 'Generating AI images...');
    start = Date.now();
    const images = await generateImages(script.sections, vc.images, jobDir);
    if (images.length > 0) {
      slides = await applyImagesToSlides(slides, images, vc.images, jobDir, resolution);
      cost.images = images.length * (vc.images.quality === 'hd' ? 0.08 : 0.04);
    }
    timing.images = (Date.now() - start) / 1000;
    console.log(
      `  Generated ${images.length} images ($${cost.images.toFixed(2)}) (${timing.images.toFixed(1)}s)`
    );
  }

  // ── Step: B-Roll (Layer 3 — optional) ──
  timing.broll = 0;
  let brollClips: any[] = [];
  if (vc.broll.enabled && config.pexelsApiKey) {
    log(++stepNum, totalSteps, 'Fetching B-roll clips...');
    start = Date.now();
    brollClips = await fetchBRollClips(script.sections, vc.broll, jobDir, resolution);
    timing.broll = (Date.now() - start) / 1000;
    cost.broll = 0; // Pexels is free
    console.log(
      `  Fetched ${brollClips.length} B-roll clips (${timing.broll.toFixed(1)}s)`
    );
  }

  // ── Step: Avatar (Layer 4 — optional, before audio when providing voice) ──
  timing.avatar = 0;
  let avatarResult: AvatarResult = { clips: [], audioClips: [], combinedAudioPath: '', totalDuration: 0 };
  const avatarProvidesVoice = vc.avatar.enabled && vc.avatar.useAvatarVoice && config.heygenApiKey && vc.avatar.avatarId;
  if (vc.avatar.enabled && config.heygenApiKey && vc.avatar.avatarId) {
    log(++stepNum, totalSteps, avatarProvidesVoice ? 'Generating avatar clips + voice...' : 'Generating avatar clips...');
    start = Date.now();
    avatarResult = await generateAvatarClips(script.sections, vc.avatar, jobDir);
    timing.avatar = (Date.now() - start) / 1000;
    cost.avatar = avatarResult.clips.length * 0.50; // ~$0.50/min estimate
    console.log(
      `  Generated ${avatarResult.clips.length} avatar clips ($${cost.avatar.toFixed(2)}) (${timing.avatar.toFixed(1)}s)`
    );
  }

  // ── Save pipeline checkpoint if avatar jobs are still pending ──
  const avatarCheckpointExists = fs.existsSync(path.join(jobDir, 'avatar-checkpoint.json'));
  if (avatarCheckpointExists) {
    fs.writeFileSync(
      path.join(jobDir, 'checkpoint.json'),
      JSON.stringify({ jobId, topic, phase: 'avatar-pending' }, null, 2)
    );
  }

  // ── Step: Audio (voice) ──
  let audio: AudioResult;
  if (avatarProvidesVoice && avatarResult.audioClips.length > 0) {
    // Avatar already generated synced audio — use it instead of edge-tts
    log(++stepNum, totalSteps, 'Using avatar-generated narration audio...');
    start = Date.now();
    audio = {
      clips: avatarResult.audioClips,
      combinedFilePath: avatarResult.combinedAudioPath,
      totalDuration: avatarResult.totalDuration,
    };
    timing.audio = (Date.now() - start) / 1000;
    cost.tts = 0; // included in avatar cost
    console.log(
      `  Using ${audio.clips.length} avatar audio clips, total ${audio.totalDuration.toFixed(1)}s`
    );
  } else {
    // Standard edge-tts path
    log(++stepNum, totalSteps, 'Generating narration audio...');
    start = Date.now();
    audio = await generateAudio(script.sections, jobDir, vc.voice);
    timing.audio = (Date.now() - start) / 1000;
    cost.tts = 0; // edge-tts is free
    console.log(
      `  Generated ${audio.clips.length} clips, total ${audio.totalDuration.toFixed(1)}s (${timing.audio.toFixed(1)}s)`
    );
  }

  // ── Step: Music + SFX + Mix (Layer 5 — optional) ──
  timing.music = 0;
  let finalAudioPath = audio.combinedFilePath;
  if (vc.music.enabled || vc.sfx.enabled) {
    log(++stepNum, totalSteps, 'Mixing audio layers...');
    start = Date.now();

    const musicTrack = await getBackgroundMusic(vc.music, audio.totalDuration, jobDir);
    const sfxAssets = generateSFXAssets(vc.sfx, jobDir);
    const mixResult = mixAudioTracks(
      audio.combinedFilePath, musicTrack, vc.music,
      sfxAssets, vc.sfx, audio.clips, jobDir
    );
    finalAudioPath = mixResult.filePath;

    timing.music = (Date.now() - start) / 1000;
    const musicInfo = musicTrack ? ` + music (${musicTrack.title})` : '';
    const sfxInfo = (sfxAssets.transitionPath || sfxAssets.introPath) ? ' + SFX' : '';
    console.log(
      `  Mixed: voice${musicInfo}${sfxInfo} (${timing.music.toFixed(1)}s)`
    );
  }

  // ── Step: Captions (optional — portrait mode only) ──
  let captionAssPath: string | null = null;
  if (vc.captions.enabled && vc.aspectRatio === '9:16' && config.openaiApiKey) {
    log(++stepNum, totalSteps, 'Generating word-by-word captions...');
    start = Date.now();
    captionAssPath = await generateCaptions(
      audio.clips, script.sections, vc.captions, vc.style, jobDir, resolution.width
    );
    const captionTime = (Date.now() - start) / 1000;
    cost.captions = audio.totalDuration * (0.006 / 60); // ~$0.006/min Whisper
    console.log(
      `  Captions ${captionAssPath ? 'generated' : 'skipped (transcription failed)'} ($${cost.captions.toFixed(3)}) (${captionTime.toFixed(1)}s)`
    );
  }

  // ── Step: Video Assembly ──
  log(++stepNum, totalSteps, 'Assembling video...');
  start = Date.now();
  // Only overlay avatar PiP on content sections (not title/CTA)
  const avatarClipsForOverlay = avatarResult.clips.filter(
    c => !['title', 'cta'].includes(script.sections[c.sectionIndex]?.slideType)
  );
  const videoTmpPath = await assembleVideo(
    slides, audio.clips, finalAudioPath, jobDir,
    brollClips, avatarClipsForOverlay, vc.avatar.enabled ? vc.avatar : undefined,
    resolution,
    vc.style.transition,
    vc.mode === 'short',
    3,
    captionAssPath
  );
  timing.video = (Date.now() - start) / 1000;
  console.log(`  Video assembled (${timing.video.toFixed(1)}s)`);

  // ── Step: Thumbnail ──
  log(++stepNum, totalSteps, 'Generating thumbnail...');
  start = Date.now();
  const thumbnailTmpPath = await generateThumbnail(slides[0].filePath, jobDir, thumbResolution);
  timing.thumbnail = (Date.now() - start) / 1000;
  console.log(
    `  Thumbnail: ${thumbResolution.width}x${thumbResolution.height} (${timing.thumbnail.toFixed(1)}s)`
  );

  // ── Step: Metadata ──
  log(++stepNum, totalSteps, 'Generating metadata...');
  start = Date.now();
  const metadata = await withRetry(() => generateMetadata(script, audio.clips, jobDir), 'metadata');
  timing.metadata = (Date.now() - start) / 1000;
  cost.metadata = 0.04;
  console.log(
    `  Title: "${metadata.title}" (${timing.metadata.toFixed(1)}s)`
  );

  // ── Finalize ──
  const videoPath = path.join(outputDir, 'video.mp4');
  const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
  const metadataPath = path.join(outputDir, 'metadata.json');

  fs.copyFileSync(videoTmpPath, videoPath);
  fs.copyFileSync(thumbnailTmpPath, thumbnailPath);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  timing.total = (Date.now() - pipelineStart) / 1000;
  cost.total = Object.entries(cost)
    .filter(([k]) => k !== 'total' && k !== 'currency')
    .reduce((sum, [, v]) => sum + (v as number), 0);

  const result: PipelineResult = {
    jobId, topic, videoPath, thumbnailPath, metadata, cost,
    timing: timing as PipelineResult['timing'],
  };

  fs.writeFileSync(
    path.join(outputDir, 'pipeline-result.json'),
    JSON.stringify(result, null, 2)
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log('Pipeline complete!');
  console.log(`${'='.repeat(60)}`);
  console.log(`Video:     ${videoPath}`);
  console.log(`Thumbnail: ${thumbnailPath}`);
  console.log(`Metadata:  ${metadataPath}`);
  console.log(`Total time: ${timing.total.toFixed(1)}s | Est. cost: $${cost.total.toFixed(2)}`);

  // Print resume hint if avatar jobs are still pending
  if (avatarCheckpointExists) {
    const avatarCp = JSON.parse(fs.readFileSync(path.join(jobDir, 'avatar-checkpoint.json'), 'utf-8'));
    const pendingCount = avatarCp.pendingJobs?.length ?? 0;
    if (pendingCount > 0) {
      console.log(`\n⏳ ${pendingCount} avatar clip(s) still processing on HeyGen.`);
      console.log(`   Resume later: npx ts-node src/cli.ts --resume ${jobId}`);
    }
  }

  return result;
}

/**
 * Resume a previously started pipeline that has pending avatar jobs.
 *
 * Loads checkpoint and job artifacts from disk, polls HeyGen for completed
 * clips, and re-runs the post-avatar pipeline (audio, mix, video, thumbnail,
 * metadata) with the full set of clips.
 */
export async function resumePipeline(resumeJobId: string): Promise<void> {
  const jobDir = path.join(config.tmpDir, resumeJobId);
  const checkpointPath = path.join(jobDir, 'checkpoint.json');

  if (!fs.existsSync(checkpointPath)) {
    throw new Error(`No checkpoint found for job ${resumeJobId}. Check the job ID and try again.`);
  }

  const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf-8')) as {
    jobId: string;
    topic: string;
    phase: string;
  };

  if (checkpoint.phase === 'complete') {
    console.log(`Job ${resumeJobId} is already complete. Nothing to resume.`);
    return;
  }

  if (checkpoint.phase !== 'avatar-pending') {
    throw new Error(`Unexpected checkpoint phase: ${checkpoint.phase}`);
  }

  // Load saved config and script
  const vcPath = path.join(jobDir, 'config.json');
  const scriptPath = path.join(jobDir, 'script.json');
  if (!fs.existsSync(vcPath) || !fs.existsSync(scriptPath)) {
    throw new Error(`Missing config.json or script.json in ${jobDir}`);
  }

  const vc: VideoConfig = JSON.parse(fs.readFileSync(vcPath, 'utf-8'));
  const script: Script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
  const resolution = getResolution(vc.aspectRatio);
  const thumbResolution = getThumbnailResolution(vc.aspectRatio);

  console.log(`\nResuming job ${resumeJobId}: "${checkpoint.topic}"`);
  console.log(`Working directory: ${jobDir}`);

  // ── Check avatar status ──
  console.log('\n[1] Checking HeyGen avatar status...');
  const { result: avatarResult, stillPending } = await resumeAvatarClips(jobDir, vc.avatar);

  if (stillPending > 0) {
    console.log(`\n⏳ ${stillPending} clip(s) still processing on HeyGen.`);
    console.log(`   Run again later: npx ts-node src/cli.ts --resume ${resumeJobId}`);
    return;
  }

  console.log(`  All avatar clips ready (${avatarResult.clips.length} clips)`);

  // ── Reload slides from disk ──
  console.log('\n[2] Reloading slides from disk...');
  const compositedDir = path.join(jobDir, 'slides-composited');
  const baseDir = path.join(jobDir, 'slides');
  const hasComposited = fs.existsSync(compositedDir);

  const slides: SlideImage[] = script.sections.map(section => {
    const name = `slide-${String(section.sectionIndex).padStart(3, '0')}.png`;
    // Prefer composited slide, fall back to base slide
    const compositedPath = path.join(compositedDir, name);
    const basePath = path.join(baseDir, name);
    const filePath = hasComposited && fs.existsSync(compositedPath) ? compositedPath : basePath;
    return {
      sectionIndex: section.sectionIndex,
      filePath,
      width: resolution.width,
      height: resolution.height,
    };
  }).filter(s => fs.existsSync(s.filePath));
  console.log(`  Loaded ${slides.length} slides`);

  // ── Reload B-roll from disk ──
  let brollClips: any[] = [];
  const brollManifestPath = path.join(jobDir, 'broll', 'manifest.json');
  if (fs.existsSync(brollManifestPath)) {
    brollClips = JSON.parse(fs.readFileSync(brollManifestPath, 'utf-8'));
    console.log(`  Loaded ${brollClips.length} B-roll clips from manifest`);
  }

  // ── Audio ──
  const avatarProvidesVoice = vc.avatar.enabled && vc.avatar.useAvatarVoice && vc.avatar.voiceId && avatarResult.audioClips.length > 0;
  let audio: AudioResult;

  if (avatarProvidesVoice) {
    console.log('\n[3] Using avatar-generated narration audio...');
    audio = {
      clips: avatarResult.audioClips,
      combinedFilePath: avatarResult.combinedAudioPath,
      totalDuration: avatarResult.totalDuration,
    };
    console.log(`  ${audio.clips.length} audio clips, total ${audio.totalDuration.toFixed(1)}s`);
  } else {
    console.log('\n[3] Generating narration audio (edge-tts)...');
    audio = await generateAudio(script.sections, jobDir, vc.voice);
    console.log(`  Generated ${audio.clips.length} clips, total ${audio.totalDuration.toFixed(1)}s`);
  }

  // ── Music + SFX + Mix ──
  let finalAudioPath = audio.combinedFilePath;
  if (vc.music.enabled || vc.sfx.enabled) {
    console.log('\n[4] Mixing audio layers...');
    const musicTrack = await getBackgroundMusic(vc.music, audio.totalDuration, jobDir);
    const sfxAssets = generateSFXAssets(vc.sfx, jobDir);
    const mixResult = mixAudioTracks(
      audio.combinedFilePath, musicTrack, vc.music,
      sfxAssets, vc.sfx, audio.clips, jobDir
    );
    finalAudioPath = mixResult.filePath;
    console.log(`  Audio mixed`);
  }

  // ── Captions (optional — portrait mode only) ──
  let captionAssPath: string | null = null;
  if (vc.captions.enabled && vc.aspectRatio === '9:16' && config.openaiApiKey) {
    console.log('\n[4.5] Generating word-by-word captions...');
    captionAssPath = await generateCaptions(
      audio.clips, script.sections, vc.captions, vc.style, jobDir, resolution.width
    );
    console.log(`  Captions ${captionAssPath ? 'generated' : 'skipped (transcription failed)'}`);
  }

  // ── Video Assembly ──
  console.log('\n[5] Assembling video...');
  const avatarClipsForOverlay = avatarResult.clips.filter(
    c => !['title', 'cta'].includes(script.sections[c.sectionIndex]?.slideType)
  );
  const videoTmpPath = await assembleVideo(
    slides, audio.clips, finalAudioPath, jobDir,
    brollClips, avatarClipsForOverlay, vc.avatar.enabled ? vc.avatar : undefined,
    resolution,
    vc.style.transition,
    vc.mode === 'short',
    3,
    captionAssPath
  );
  console.log(`  Video assembled`);

  // ── Thumbnail ──
  console.log('\n[6] Generating thumbnail...');
  const thumbnailTmpPath = await generateThumbnail(slides[0].filePath, jobDir, thumbResolution);

  // ── Metadata ──
  console.log('\n[7] Generating metadata...');
  const metadata = await withRetry(() => generateMetadata(script, audio.clips, jobDir), 'metadata');
  console.log(`  Title: "${metadata.title}"`);

  // ── Finalize ──
  const outputDir = path.join(config.outputDir, resumeJobId);
  fs.mkdirSync(outputDir, { recursive: true });

  const videoPath = path.join(outputDir, 'video.mp4');
  const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
  const metadataPath = path.join(outputDir, 'metadata.json');

  fs.copyFileSync(videoTmpPath, videoPath);
  fs.copyFileSync(thumbnailTmpPath, thumbnailPath);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  // Mark checkpoint as complete
  fs.writeFileSync(checkpointPath, JSON.stringify({
    ...checkpoint,
    phase: 'complete',
  }, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log('Resume complete!');
  console.log(`${'='.repeat(60)}`);
  console.log(`Video:     ${videoPath}`);
  console.log(`Thumbnail: ${thumbnailPath}`);
  console.log(`Metadata:  ${metadataPath}`);
}

/**
 * Quick preview mode — skips research, script, and metadata generation.
 * Uses a hardcoded 3-section script to produce a ~8s test video.
 * Useful for testing styles, music levels, SFX, portrait layout, etc.
 * Zero API cost (unless --images is enabled).
 */
export async function runPreview(
  topic: string,
  videoConfig?: Partial<VideoConfig>,
  previewDurationSec?: number
): Promise<void> {
  // Merge config (same as runPipeline)
  const vc: VideoConfig = {
    ...DEFAULT_VIDEO_CONFIG,
    ...videoConfig,
    mode: videoConfig?.mode ?? DEFAULT_VIDEO_CONFIG.mode,
    style: videoConfig?.style ?? DEFAULT_VIDEO_CONFIG.style,
    voice: videoConfig?.voice ?? DEFAULT_VIDEO_CONFIG.voice,
    images: { ...DEFAULT_VIDEO_CONFIG.images, ...videoConfig?.images },
    broll: { ...DEFAULT_VIDEO_CONFIG.broll, ...videoConfig?.broll },
    avatar: { ...DEFAULT_VIDEO_CONFIG.avatar, ...videoConfig?.avatar },
    music: { ...DEFAULT_VIDEO_CONFIG.music, ...videoConfig?.music },
    sfx: { ...DEFAULT_VIDEO_CONFIG.sfx, ...videoConfig?.sfx },
    captions: { ...DEFAULT_VIDEO_CONFIG.captions, ...videoConfig?.captions },
  };

  const resolution = getResolution(vc.aspectRatio);
  const thumbResolution = getThumbnailResolution(vc.aspectRatio);

  if (vc.aspectRatio === '9:16' && vc.images.enabled) {
    vc.images = { ...vc.images, size: '1024x1792' };
  }

  const jobId = uuidv4().slice(0, 8);
  const jobDir = path.join(config.tmpDir, jobId);
  const outputDir = path.join(config.outputDir, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\nPREVIEW MODE — no API calls (research/script/metadata skipped)`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Topic: "${topic}"`);
  console.log(`Mode: ${vc.mode} | Style: ${vc.style.name} | Voice: ${vc.voice.name} | Aspect: ${vc.aspectRatio} (${resolution.width}x${resolution.height})`);
  const layers: string[] = ['slides', 'voice'];
  if (vc.music.enabled) layers.push('music');
  if (vc.sfx.enabled) layers.push('sfx');
  if (vc.images.enabled && config.openaiApiKey) layers.push('images');
  console.log(`Active layers: ${layers.join(', ')}`);

  const previewStart = Date.now();

  // Default section durations (total ~10s)
  const defaultDurations = [3, 4, 3];
  const targetDuration = previewDurationSec || 10;
  const defaultTotal = defaultDurations.reduce((a, b) => a + b, 0);
  const scale = targetDuration / defaultTotal;
  const durations = defaultDurations.map((d) => Math.max(1, Math.round(d * scale * 10) / 10));

  // Hardcoded 3-section script
  const sections: ScriptSection[] = [
    {
      sectionIndex: 0,
      slideType: 'title',
      narrationText: `Here is a preview for: ${topic}.`,
      slideData: { type: 'title', title: topic, subtitle: 'Preview Mode' },
      estimatedDuration: durations[0],
    },
    {
      sectionIndex: 1,
      slideType: 'stats',
      narrationText: 'These are sample statistics to preview the layout and audio mixing.',
      slideData: {
        type: 'stats',
        title: 'Sample Statistics',
        stats: [
          { value: '85%', label: 'Quality Score' },
          { value: '2.4x', label: 'Performance Gain' },
          { value: '10K+', label: 'Users Reached' },
          { value: '$0.00', label: 'Preview Cost' },
        ],
      },
      estimatedDuration: durations[1],
    },
    {
      sectionIndex: 2,
      slideType: 'cta',
      narrationText: 'This concludes the preview. Run without the preview flag for the full video.',
      slideData: { type: 'cta', title: 'Preview Complete', subtitle: 'Run the full pipeline when ready', action: 'Generate Full Video' },
      estimatedDuration: durations[2],
    },
  ];

  // Slides
  console.log('\n[1] Rendering slides...');
  let slides = await renderSlides(sections, jobDir, vc.style, resolution);

  // Images (optional — this does cost money)
  if (vc.images.enabled && config.openaiApiKey) {
    console.log('[2] Generating AI images...');
    const images = await (await import('./services/images')).generateImages(sections, vc.images, jobDir);
    if (images.length > 0) {
      slides = await (await import('./services/images')).applyImagesToSlides(slides, images, vc.images, jobDir, resolution);
    }
  }

  // Audio — generate silent clips (no edge-tts dependency in preview)
  console.log('[2] Generating silent narration...');
  const audioDir = path.join(jobDir, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  const clips: AudioClip[] = [];
  for (const section of sections) {
    const clipPath = path.join(audioDir, `section_${section.sectionIndex}.mp3`);
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=24000:cl=mono -t ${section.estimatedDuration} -c:a libmp3lame -q:a 6 "${clipPath}"`,
      { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' }
    );
    clips.push({ sectionIndex: section.sectionIndex, filePath: clipPath, duration: section.estimatedDuration });
  }
  // Concat into combined narration
  const concatListPath = path.join(audioDir, 'concat.txt');
  fs.writeFileSync(concatListPath, clips.map((c) => `file '${c.filePath}'`).join('\n'));
  const combinedPath = path.join(audioDir, 'narration.mp3');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:a libmp3lame -q:a 4 "${combinedPath}"`,
    { encoding: 'utf-8', timeout: 15000, stdio: 'pipe' }
  );
  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);
  const audio: AudioResult = { clips, combinedFilePath: combinedPath, totalDuration };

  // Music + SFX
  let finalAudioPath = audio.combinedFilePath;
  if (vc.music.enabled || vc.sfx.enabled) {
    console.log('[3] Mixing audio layers...');
    const musicTrack = await getBackgroundMusic(vc.music, audio.totalDuration, jobDir);
    const sfxAssets = generateSFXAssets(vc.sfx, jobDir);
    const mixResult = mixAudioTracks(
      audio.combinedFilePath, musicTrack, vc.music,
      sfxAssets, vc.sfx, audio.clips, jobDir
    );
    finalAudioPath = mixResult.filePath;
  }

  // Video assembly
  console.log('[4] Assembling video...');
  const videoTmpPath = await assembleVideo(
    slides, audio.clips, finalAudioPath, jobDir, [], [], undefined,
    resolution, vc.style.transition, vc.mode === 'short'
  );

  // Thumbnail
  const thumbnailTmpPath = await generateThumbnail(slides[0].filePath, jobDir, thumbResolution);

  // Copy to output
  const videoPath = path.join(outputDir, 'video.mp4');
  const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
  fs.copyFileSync(videoTmpPath, videoPath);
  fs.copyFileSync(thumbnailTmpPath, thumbnailPath);

  const elapsed = ((Date.now() - previewStart) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PREVIEW complete in ${elapsed}s — $0.00`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Video:     ${videoPath}`);
  console.log(`Thumbnail: ${thumbnailPath}`);
}

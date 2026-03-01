import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import {
  SlideImage,
  AudioClip,
  BRollClip,
  AvatarClip,
  AvatarConfig,
  StyleGuide,
} from '../types';

/**
 * Assemble the final video from all layers.
 *
 * Composition order (bottom to top):
 * 1. Slide images (base layer, timed to audio clips)
 * 2. B-roll segments (replace slide for their duration at specified sections)
 * 3. Avatar overlay (picture-in-picture, positioned per config)
 *
 * Audio is muxed separately (already mixed by mixer.ts).
 */
export async function assembleVideo(
  slides: SlideImage[],
  audioClips: AudioClip[],
  audioPath: string,
  jobDir: string,
  brollClips: BRollClip[] = [],
  avatarClips: AvatarClip[] = [],
  avatarConfig?: AvatarConfig,
  resolution?: { width: number; height: number },
  transition?: StyleGuide['transition'],
  applyZoom?: boolean,
  avatarDisplaySec: number = 3,
  assFilePath?: string | null
): Promise<string> {
  const outputPath = path.join(jobDir, 'video.mp4');
  const W = resolution?.width ?? config.videoWidth;
  const H = resolution?.height ?? config.videoHeight;

  // If no B-roll and no avatar, use the simple concat approach (faster)
  if (brollClips.length === 0 && avatarClips.length === 0) {
    return assembleSimple(slides, audioClips, audioPath, jobDir, outputPath, W, H, transition, applyZoom, assFilePath);
  }

  // Complex assembly with filter_complex for overlays
  return assembleLayered(
    slides, audioClips, audioPath, jobDir, outputPath,
    brollClips, avatarClips, avatarConfig, W, H, transition, applyZoom, avatarDisplaySec, assFilePath
  );
}

/**
 * Build the base slideshow video (no audio) from slide images.
 *
 * When transition.type === 'fade' or 'slide': uses xfade filter chain between
 * slide inputs, with optional Ken Burns (zoompan) on each slide.
 *   - 'fade': crossfade between slides
 *   - 'slide': alternating slideleft / slideright
 *
 * When transition.type === 'none' (or undefined): uses the fast concat demuxer.
 *
 * Returns the path to the base slideshow video file.
 */
function buildBaseSlideshow(
  slides: SlideImage[],
  audioClips: AudioClip[],
  jobDir: string,
  outputPath: string,
  W: number,
  H: number,
  transition?: StyleGuide['transition'],
  applyZoom?: boolean
): string {
  const fps = config.videoFps;
  const durations = slides.map((slide) => {
    const clip = audioClips.find((c) => c.sectionIndex === slide.sectionIndex);
    return clip ? clip.duration : 5;
  });
  const totalDuration = durations.reduce((a, b) => a + b, 0);

  const useXfade =
    (transition?.type === 'fade' || transition?.type === 'slide') &&
    slides.length > 1;

  if (useXfade) {
    // Clamp fade duration so it never exceeds half the shortest slide
    const fadeSec = Math.min(
      Math.max(0.1, transition!.durationMs / 1000),
      Math.min(...durations) * 0.5
    );

    // Each slide becomes a video input.
    // When using zoompan: raw image input (1 frame) — zoompan generates d frames.
    // Without zoompan: loop image into a video stream for the slide duration.
    const inputs = slides.map((slide, i) => {
      if (applyZoom) {
        return `-i "${slide.filePath}"`;
      }
      return `-loop 1 -t ${durations[i].toFixed(3)} -framerate ${fps} -i "${slide.filePath}"`;
    });

    // Build per-input filters (scale + optional zoompan)
    const perInput: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      const d = durations[i];
      const frames = Math.ceil(d * fps);

      if (applyZoom) {
        // Ken Burns: scale to 4x intermediate for finer sub-pixel granularity,
        // alternate zoom-in (even slides) and zoom-out (odd slides).
        // zoompan z=1.0 = full input visible (no crop). Higher z = more cropped/zoomed.
        // 4x input provides more source pixels so panning/zooming is smoother.
        // Zoom range: 1.0 → 1.05 (5% zoom in) or 1.05 → 1.0 (5% zoom out).
        // Uses sine-based easing for smooth start/stop.
        const scaleW = W * 4;
        const scaleH = H * 4;
        const zDenom = Math.max(frames - 1, 1);
        const zoomIn = i % 2 === 0;
        // Ease-in-out via (1-cos(t*PI))/2 for smooth acceleration/deceleration
        const easeExpr = `(1-cos(on/${zDenom}*PI))/2`;
        const zExpr = zoomIn
          ? `1.0+0.05*(${easeExpr})`    // 1.0 → 1.05 (zoom in 5%)
          : `1.05-0.05*(${easeExpr})`;  // 1.05 → 1.0 (zoom out 5%)
        perInput.push(
          `[${i}:v]scale=${scaleW}:${scaleH}:force_original_aspect_ratio=decrease,pad=${scaleW}:${scaleH}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,zoompan=z='${zExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${fps}[s${i}]`
        );
      } else {
        perInput.push(
          `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,setpts=PTS-STARTPTS[s${i}]`
        );
      }
    }

    // Chain xfade between consecutive pairs
    const xfades: string[] = [];
    let prevLabel = 's0';
    for (let i = 0; i < slides.length - 1; i++) {
      // offset_i = sum(durations[0..i]) - (i+1) * fadeSec
      const offset = durations.slice(0, i + 1).reduce((a, b) => a + b, 0) - (i + 1) * fadeSec;
      const outLabel = i < slides.length - 2 ? `xf${i}` : 'vout';

      // Choose xfade transition type
      let xfadeType: string;
      if (transition!.type === 'slide') {
        xfadeType = i % 2 === 0 ? 'slideleft' : 'slideright';
      } else {
        xfadeType = 'fade';
      }

      xfades.push(
        `[${prevLabel}][s${i + 1}]xfade=transition=${xfadeType}:duration=${fadeSec.toFixed(3)}:offset=${offset.toFixed(3)}[${outLabel}]`
      );
      prevLabel = outLabel;
    }

    const filterComplex = [...perInput, ...xfades].join(';');

    const cmd = [
      'ffmpeg -y',
      inputs.join(' '),
      `-filter_complex "${filterComplex}"`,
      `-map "[vout]"`,
      '-c:v libx264 -preset fast -crf 23 -an',
      `"${outputPath}"`,
    ].join(' ');

    execSync(cmd, { encoding: 'utf-8', timeout: 600000, stdio: 'pipe' });
    return outputPath;
  }

  // Fallback: concat demuxer (fast, no transitions)
  const concatLines: string[] = [];
  for (let i = 0; i < slides.length; i++) {
    concatLines.push(`file '${slides[i].filePath}'`);
    concatLines.push(`duration ${durations[i].toFixed(3)}`);
  }
  // Sentinel entry required by concat demuxer for the last frame
  if (slides.length > 0) {
    concatLines.push(`file '${slides[slides.length - 1].filePath}'`);
  }

  const concatFilePath = path.join(jobDir, 'video-concat.txt');
  fs.writeFileSync(concatFilePath, concatLines.join('\n'));

  // Use -t to cap duration — prevents the sentinel entry from extending the video
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p" -r ${fps} -t ${totalDuration.toFixed(3)} -c:v libx264 -preset fast -crf 23 -an "${outputPath}"`,
    { encoding: 'utf-8', timeout: 300000, stdio: 'pipe' }
  );
  return outputPath;
}

/**
 * Check if FFmpeg has the 'ass' filter available (requires libass).
 */
function hasAssFilter(): boolean {
  try {
    const out = execSync('ffmpeg -hide_banner -filters 2>&1', { encoding: 'utf-8' });
    return out.includes(' ass ');
  } catch {
    return false;
  }
}

/**
 * Burn ASS subtitles into a video file.
 * Returns the path to the output video with captions burned in.
 */
function burnCaptions(inputPath: string, assFilePath: string, jobDir: string): string {
  if (!hasAssFilter()) {
    console.error(
      '  WARNING: FFmpeg lacks libass — cannot burn captions.\n' +
      '  Install with: brew uninstall ffmpeg && brew install homebrew-ffmpeg/ffmpeg/ffmpeg --with-libass --with-freetype'
    );
    return inputPath;
  }

  const captionOutput = path.join(jobDir, 'with-captions.mp4');
  const escaped = assFilePath.replace(/\\/g, '/').replace(/:/g, '\\:');
  execSync(
    `ffmpeg -y -i "${inputPath}" -vf "ass='${escaped}'" -c:v libx264 -preset fast -crf 23 -an "${captionOutput}"`,
    { encoding: 'utf-8', timeout: 300000, stdio: 'pipe' }
  );
  return captionOutput;
}

/**
 * Simple assembly (Layer 0-2: slides + audio only).
 */
function assembleSimple(
  slides: SlideImage[],
  audioClips: AudioClip[],
  audioPath: string,
  jobDir: string,
  outputPath: string,
  W: number = config.videoWidth,
  H: number = config.videoHeight,
  transition?: StyleGuide['transition'],
  applyZoom?: boolean,
  assFilePath?: string | null
): string {
  const basePath = path.join(jobDir, 'base-slideshow.mp4');
  buildBaseSlideshow(slides, audioClips, jobDir, basePath, W, H, transition, applyZoom);

  let currentVideoPath = basePath;

  // Burn in captions if provided
  if (assFilePath) {
    currentVideoPath = burnCaptions(currentVideoPath, assFilePath, jobDir);
  }

  // Mux base video with audio
  const cmd = [
    'ffmpeg -y',
    `-i "${currentVideoPath}"`,
    `-i "${audioPath}"`,
    `-c:v ${currentVideoPath === basePath ? 'copy' : 'copy'} -c:a aac -b:a 192k`,
    '-shortest',
    '-movflags +faststart',
    `"${outputPath}"`,
  ].join(' ');

  execSync(cmd, { encoding: 'utf-8', timeout: 300000, stdio: 'pipe' });
  return outputPath;
}

/**
 * Layered assembly with B-roll and/or avatar overlays.
 *
 * Strategy: Build the base slideshow first (with optional fade/zoom),
 * then overlay B-roll segments and avatar PiP in subsequent passes.
 */
function assembleLayered(
  slides: SlideImage[],
  audioClips: AudioClip[],
  audioPath: string,
  jobDir: string,
  outputPath: string,
  brollClips: BRollClip[],
  avatarClips: AvatarClip[],
  avatarConfig?: AvatarConfig,
  W: number = config.videoWidth,
  H: number = config.videoHeight,
  transition?: StyleGuide['transition'],
  applyZoom?: boolean,
  avatarDisplaySec: number = 3,
  assFilePath?: string | null
): string {
  // Step 1: Build base slideshow (no audio) — with optional fade/zoom
  const basePath = path.join(jobDir, 'base-slideshow.mp4');
  buildBaseSlideshow(slides, audioClips, jobDir, basePath, W, H, transition, applyZoom);

  // Step 2: Overlay B-roll segments at their timestamps
  let currentVideoPath = basePath;

  if (brollClips.length > 0) {
    const brollOutputPath = path.join(jobDir, 'with-broll.mp4');
    currentVideoPath = overlayBRoll(
      currentVideoPath, brollOutputPath, brollClips, audioClips, jobDir, W, H
    );
  }

  // Step 3: Overlay avatar PiP
  if (avatarClips.length > 0 && avatarConfig) {
    const avatarOutputPath = path.join(jobDir, 'with-avatar.mp4');
    currentVideoPath = overlayAvatar(
      currentVideoPath, avatarOutputPath, avatarClips, audioClips, avatarConfig, jobDir, W, H, avatarDisplaySec
    );
  }

  // Step 3.5: Burn in captions
  if (assFilePath) {
    currentVideoPath = burnCaptions(currentVideoPath, assFilePath, jobDir);
  }

  // Step 4: Mux with final mixed audio
  execSync(
    `ffmpeg -y -i "${currentVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${outputPath}"`,
    { encoding: 'utf-8', timeout: 300000, stdio: 'pipe' }
  );

  return outputPath;
}

/**
 * Overlay B-roll video segments onto the base slideshow at the correct timestamps.
 * Each B-roll clip replaces the slide for its section.
 */
function overlayBRoll(
  basePath: string,
  outputPath: string,
  brollClips: BRollClip[],
  audioClips: AudioClip[],
  jobDir: string,
  W: number = config.videoWidth,
  H: number = config.videoHeight
): string {
  // Calculate start timestamps for each section
  const sectionStarts = new Map<number, number>();
  let cumulative = 0;
  for (const clip of audioClips) {
    sectionStarts.set(clip.sectionIndex, cumulative);
    cumulative += clip.duration;
  }

  // Build filter_complex to overlay each B-roll clip
  const inputs = [`-i "${basePath}"`];
  const filters: string[] = [];
  let prevLabel = '0:v';

  brollClips.forEach((broll, i) => {
    const startSec = sectionStarts.get(broll.sectionIndex) || 0;
    inputs.push(`-i "${broll.filePath}"`);
    const inputIdx = i + 1;
    const outLabel = `v${i}`;

    filters.push(
      `[${inputIdx}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS+${startSec}/TB[broll${i}]`
    );
    filters.push(
      `[${prevLabel}][broll${i}]overlay=enable='between(t,${startSec},${startSec + broll.duration})'[${outLabel}]`
    );
    prevLabel = outLabel;
  });

  const cmd = [
    'ffmpeg -y',
    inputs.join(' '),
    `-filter_complex "${filters.join(';')}"`,
    `-map "[${prevLabel}]"`,
    '-c:v libx264 -preset fast -crf 23 -an',
    `"${outputPath}"`,
  ].join(' ');

  execSync(cmd, { encoding: 'utf-8', timeout: 300000, stdio: 'pipe' });
  return outputPath;
}

/**
 * Overlay avatar PiP (picture-in-picture) onto the video.
 */
/**
 * Probe an avatar clip's actual width and height via ffprobe.
 */
function probeVideoDimensions(filePath: string): { w: number; h: number } {
  const result = execSync(
    `ffprobe -v quiet -print_format json -show_streams -select_streams v:0 "${filePath}"`,
    { encoding: 'utf-8' }
  );
  const stream = JSON.parse(result).streams?.[0];
  return { w: stream?.width || 480, h: stream?.height || 480 };
}

function overlayAvatar(
  basePath: string,
  outputPath: string,
  avatarClips: AvatarClip[],
  audioClips: AudioClip[],
  avatarConfig: AvatarConfig,
  jobDir: string,
  W: number = config.videoWidth,
  H: number = config.videoHeight,
  avatarDisplaySec: number = 3
): string {
  const isPortrait = H > W;
  const avatarW = Math.round(W * (avatarConfig.scale / 100));

  // Probe the first clip to get the avatar's native aspect ratio
  const native = avatarClips.length > 0
    ? probeVideoDimensions(avatarClips[0].filePath)
    : { w: 1, h: 1 };

  // Portrait mode: crop center head/torso, then compute height from cropped aspect ratio
  const cropX = avatarConfig.portraitCropX || 0.70;
  const cropY = avatarConfig.portraitCropY || 0.85;
  let avatarH: number;
  if (isPortrait) {
    // Height from cropped aspect ratio: cropY / cropX
    avatarH = Math.round(avatarW * (cropY / cropX));
    // Cap to bottom 1/3 of frame
    const maxAvatarZone = Math.round(H / 3);
    avatarH = Math.min(avatarH, maxAvatarZone);
  } else {
    avatarH = Math.round(avatarW * (native.h / native.w));
  }

  // Position
  let x: number, y: number;
  if (isPortrait) {
    // Portrait: centered horizontally, flush with bottom edge
    x = Math.round((W - avatarW) / 2);
    y = H - avatarH;
  } else {
    const margin = 40;
    switch (avatarConfig.position) {
      case 'bottom-left':
        x = margin; y = H - avatarH - margin; break;
      case 'bottom-center':
        x = Math.round((W - avatarW) / 2); y = H - avatarH - margin; break;
      default: // bottom-right
        x = W - avatarW - margin; y = H - avatarH - margin; break;
    }
  }

  // Calculate timestamps
  const sectionStarts = new Map<number, number>();
  let cumulative = 0;
  for (const clip of audioClips) {
    sectionStarts.set(clip.sectionIndex, cumulative);
    cumulative += clip.duration;
  }

  const inputs = [`-i "${basePath}"`];
  const filters: string[] = [];
  let prevLabel = '0:v';

  avatarClips.forEach((avatar, i) => {
    const startSec = sectionStarts.get(avatar.sectionIndex) || 0;
    inputs.push(`-i "${avatar.filePath}"`);
    const inputIdx = i + 1;
    const outLabel = `av${i}`;

    const showDuration = Math.min(avatar.duration, avatarDisplaySec);

    // Portrait mode: crop to center head/torso before scaling
    // crop=iw*cropX:ih*cropY:iw*(1-cropX)/2:0
    // Crops cropX% width centered, cropY% height from top
    let scaleFilter: string;
    if (isPortrait) {
      const cropXOffset = ((1 - cropX) / 2).toFixed(4);
      scaleFilter = `crop=iw*${cropX}:ih*${cropY}:iw*${cropXOffset}:0,scale=${avatarW}:${avatarH},format=yuva420p,colorkey=0x00FF00:0.3:0.2`;
    } else {
      scaleFilter = `scale=${avatarW}:${avatarH},format=yuva420p,colorkey=0x00FF00:0.3:0.2`;
    }

    // Time-shift avatar PTS so its frames align with the enable window
    filters.push(
      `[${inputIdx}:v]${scaleFilter},setpts=PTS-STARTPTS+${startSec}/TB[aov${i}]`
    );
    filters.push(
      `[${prevLabel}][aov${i}]overlay=${x}:${y}:enable='between(t,${startSec},${startSec + showDuration})'[${outLabel}]`
    );
    prevLabel = outLabel;
  });

  const cmd = [
    'ffmpeg -y',
    inputs.join(' '),
    `-filter_complex "${filters.join(';')}"`,
    `-map "[${prevLabel}]"`,
    '-c:v libx264 -preset fast -crf 23 -an',
    `"${outputPath}"`,
  ].join(' ');

  execSync(cmd, { encoding: 'utf-8', timeout: 300000, stdio: 'pipe' });
  return outputPath;
}

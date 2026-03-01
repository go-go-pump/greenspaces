import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { config } from '../config';
import {
  AudioClip,
  ScriptSection,
  CaptionConfig,
  WordTimestamp,
  StyleGuide,
} from '../types';

/**
 * Transcribe audio via OpenAI Whisper API with word-level timestamps.
 * Uses raw https module (same pattern as HeyGen in avatar.ts — no new deps).
 */
async function transcribeWithWhisper(audioPath: string): Promise<WordTimestamp[]> {
  const apiKey = config.openaiApiKey;
  if (!apiKey) throw new Error('OPENAI_API_KEY required for captions');

  const audioData = fs.readFileSync(audioPath);
  const fileName = path.basename(audioPath);
  const boundary = `----FormBoundary${Date.now()}`;

  // Build multipart/form-data body
  const parts: Buffer[] = [];

  // file field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: audio/mpeg\r\n\r\n`
  ));
  parts.push(audioData);
  parts.push(Buffer.from('\r\n'));

  // model field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`
  ));

  // response_format field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n`
  ));

  // timestamp_granularities[] field
  parts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\nword\r\n`
  ));

  // closing boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Whisper API ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const words: WordTimestamp[] = (parsed.words || []).map((w: any) => ({
            word: w.word,
            start: w.start,
            end: w.end,
          }));
          resolve(words);
        } catch (e: any) {
          reject(new Error(`Failed to parse Whisper response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Convert a hex color like "#667eea" to ASS color format "&H00EAEEFF&"
 * (ASS uses &HAABBGGRR& format — alpha, blue, green, red)
 */
function hexToAss(hex: string, alpha: number = 0): string {
  const clean = hex.replace('#', '');
  const r = clean.substring(0, 2);
  const g = clean.substring(2, 4);
  const b = clean.substring(4, 6);
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
  return `&H${a}${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}&`;
}

/**
 * Format time in seconds to ASS timestamp: H:MM:SS.CC
 */
function assTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Generate a combined ASS subtitle file with karaoke-fill word-by-word highlighting.
 *
 * Groups words into phrases of N words. Each phrase is one Dialogue line.
 * Uses \kf (karaoke fill) tags so each word highlights as the narrator speaks it.
 *
 * PrimaryColour = accent color (highlighted word)
 * SecondaryColour = text color (not-yet-spoken words)
 * BorderStyle=3 with BackColour for semi-transparent box behind text
 */
function generateCombinedAss(
  words: WordTimestamp[],
  captionConfig: CaptionConfig,
  style: StyleGuide,
  videoWidth: number
): string {
  const { wordsPerPhrase, fontSize, bandY, bandHeight, backgroundOpacity } = captionConfig;

  const centerX = Math.round(videoWidth / 2);
  const centerY = bandY + Math.round(bandHeight / 2);

  // ASS colors
  const primaryColour = hexToAss(style.colors.primary);       // highlighted word
  const secondaryColour = hexToAss(style.colors.text);         // not-yet-spoken
  const outlineColour = hexToAss('#000000');                    // outline
  const backColour = hexToAss('#000000', backgroundOpacity);   // semi-transparent box bg

  const header = `[Script Info]
Title: Video Captions
ScriptType: v4.00+
WrapStyle: 0
PlayResX: ${videoWidth}
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,${fontSize},${primaryColour},${secondaryColour},${outlineColour},${backColour},1,0,0,0,100,100,2,0,3,2,0,5,20,20,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  // Group words into phrases
  const phrases: WordTimestamp[][] = [];
  for (let i = 0; i < words.length; i += wordsPerPhrase) {
    phrases.push(words.slice(i, i + wordsPerPhrase));
  }

  // Generate dialogue lines with karaoke fill tags
  const dialogueLines: string[] = [];

  for (const phrase of phrases) {
    if (phrase.length === 0) continue;

    const phraseStart = phrase[0].start;
    const phraseEnd = phrase[phrase.length - 1].end;

    // Build karaoke text: {\kf<centiseconds>}word for each word
    const karaokeText = phrase.map((w) => {
      const durationCs = Math.round((w.end - w.start) * 100);
      return `{\\kf${durationCs}}${w.word}`;
    }).join(' ');

    // Position at center of caption band
    const text = `{\\pos(${centerX},${centerY})}${karaokeText}`;

    dialogueLines.push(
      `Dialogue: 0,${assTimestamp(phraseStart)},${assTimestamp(phraseEnd)},Caption,,0,0,0,,${text}`
    );
  }

  return header + '\n' + dialogueLines.join('\n') + '\n';
}

/**
 * Generate word-by-word animated captions for the video.
 *
 * - Skips title/CTA sections
 * - Transcribes each section's audio via Whisper with word-level timestamps
 * - Offsets timestamps by cumulative section start times
 * - Combines all into one ASS file
 * - Graceful failure: if Whisper errors on a section, skip it; if all fail, return null
 *
 * @returns ASS file path, or null on failure
 */
export async function generateCaptions(
  audioClips: AudioClip[],
  sections: ScriptSection[],
  captionConfig: CaptionConfig,
  style: StyleGuide,
  jobDir: string,
  videoWidth: number,
): Promise<string | null> {
  const captionDir = path.join(jobDir, 'captions');
  fs.mkdirSync(captionDir, { recursive: true });

  // Calculate section start times
  const sectionStarts = new Map<number, number>();
  let cumulative = 0;
  for (const clip of audioClips) {
    sectionStarts.set(clip.sectionIndex, cumulative);
    cumulative += clip.duration;
  }

  // Transcribe each content section (skip title/CTA)
  const allWords: WordTimestamp[] = [];
  let successCount = 0;

  for (const clip of audioClips) {
    const section = sections.find(s => s.sectionIndex === clip.sectionIndex);
    if (!section) continue;

    // Skip title and CTA sections
    if (section.slideType === 'title' || section.slideType === 'cta') continue;

    const offset = sectionStarts.get(clip.sectionIndex) || 0;

    try {
      console.log(`  Transcribing section ${clip.sectionIndex} (${section.slideType})...`);
      const words = await transcribeWithWhisper(clip.filePath);

      // Offset word timestamps by section start time
      for (const w of words) {
        allWords.push({
          word: w.word,
          start: w.start + offset,
          end: w.end + offset,
        });
      }
      successCount++;
    } catch (err: any) {
      console.error(`  WARNING: Whisper failed for section ${clip.sectionIndex}: ${err.message}`);
      // Skip this section — graceful degradation
    }
  }

  if (successCount === 0 || allWords.length === 0) {
    console.error('  WARNING: All Whisper transcriptions failed — skipping captions');
    return null;
  }

  // Sort words by start time (should already be in order, but be safe)
  allWords.sort((a, b) => a.start - b.start);

  // Generate combined ASS file
  const assContent = generateCombinedAss(allWords, captionConfig, style, videoWidth);
  const assPath = path.join(captionDir, 'captions.ass');
  fs.writeFileSync(assPath, assContent);

  console.log(`  Generated captions: ${allWords.length} words, ${Math.ceil(allWords.length / captionConfig.wordsPerPhrase)} phrases`);
  return assPath;
}

import * as dotenv from 'dotenv';
import * as path from 'path';
import { AspectRatio } from './types';

dotenv.config();

export const config = {
  // API keys
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  pexelsApiKey: process.env.PEXELS_API_KEY || '',
  heygenApiKey: process.env.HEYGEN_API_KEY || '',
  pixabayApiKey: process.env.PIXABAY_API_KEY || '',
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Adam

  // Models
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',

  // TTS
  ttsProvider: (process.env.TTS_PROVIDER || 'edge-tts') as 'edge-tts' | 'elevenlabs',
  edgeTtsVoice: process.env.EDGE_TTS_VOICE || 'en-US-GuyNeural',

  // Paths
  outputDir: path.resolve(process.env.OUTPUT_DIR || './output'),
  tmpDir: path.resolve(process.env.TMP_DIR || './tmp'),
  templatesDir: path.resolve(__dirname, 'templates/slides'),

  // Video settings
  videoWidth: 1920,
  videoHeight: 1080,
  videoFps: 24,

  // Thumbnail
  thumbnailWidth: 1280,
  thumbnailHeight: 720,
} as const;

export function getResolution(aspectRatio: AspectRatio): { width: number; height: number } {
  return aspectRatio === '9:16'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

export function getThumbnailResolution(aspectRatio: AspectRatio): { width: number; height: number } {
  return aspectRatio === '9:16'
    ? { width: 720, height: 1280 }
    : { width: 1280, height: 720 };
}

export function validateConfig(): void {
  if (!config.anthropicApiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Copy .env.example to .env and add your key.'
    );
  }
}

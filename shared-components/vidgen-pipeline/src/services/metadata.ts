import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { Script, AudioClip, VideoMetadata } from '../types';

function fixJson(str: string): string {
  return str.replace(/,\s*([\]}])/g, '$1');
}

const METADATA_PROMPT = `Generate YouTube-optimized metadata for this video.

IMPORTANT: Your response must be ONLY valid JSON, no markdown fences, no extra text.

Return this exact structure:
{
  "title": "Catchy YouTube title (under 70 characters)",
  "description": "Full YouTube description with overview paragraph, then timestamps section, then tags paragraph. 200-400 words.",
  "tags": ["tag1", "tag2", ...],
  "timestamps": [{"time": "0:00", "label": "Introduction"}, ...]
}

Guidelines:
- Title: engaging, includes main keyword, under 70 chars
- Description: start with a hook, include key takeaways, end with CTA
- Tags: 15-20 relevant tags, mix of broad and specific
- Timestamps: match the actual video sections`;

/**
 * Format seconds as M:SS timestamp.
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export async function generateMetadata(
  script: Script,
  audioClips: AudioClip[],
  jobDir: string
): Promise<VideoMetadata> {
  // Build timestamp data from actual audio durations
  let currentTime = 0;
  const sections = script.sections.map((s, i) => {
    const timestamp = formatTimestamp(currentTime);
    const clip = audioClips.find((c) => c.sectionIndex === i);
    currentTime += clip ? clip.duration : s.estimatedDuration;
    return {
      time: timestamp,
      slideType: s.slideType,
      title:
        'title' in s.slideData
          ? (s.slideData as any).title
          : `Section ${i + 1}`,
    };
  });

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${METADATA_PROMPT}\n\nVideo topic: "${script.topic}"\n\nSections with timestamps:\n${JSON.stringify(sections, null, 2)}`,
      },
    ],
  });

  let resultText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      resultText += block.text;
    }
  }

  let jsonStr = resultText.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  let metadata: VideoMetadata;
  try {
    metadata = JSON.parse(fixJson(jsonStr));
  } catch (e) {
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse metadata JSON');
    }
    metadata = JSON.parse(fixJson(jsonMatch[0]));
  }

  // Save metadata
  const metadataPath = path.join(jobDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return metadata;
}

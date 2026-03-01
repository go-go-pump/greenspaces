import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { ResearchResult, Script, ScriptSection, SlideType, VideoMode } from '../types';

function fixJson(str: string): string {
  return str.replace(/,\s*([\]}])/g, '$1');
}

const SCRIPT_PROMPT = `You are a video script writer. Given research data, create a narrated slideshow script.

IMPORTANT: Your response must be ONLY valid JSON, no markdown fences, no extra text.

Return this exact structure:
{
  "topic": "the topic",
  "sections": [
    {
      "sectionIndex": 0,
      "slideType": "title",
      "narrationText": "The text to be spoken aloud as voiceover...",
      "slideData": { ... },
      "estimatedDuration": 10
    }
  ],
  "totalEstimatedDuration": 180
}

SLIDE TYPES AND THEIR slideData FORMATS:

1. "title" — First slide, always:
   { "type": "title", "title": "Main Title", "subtitle": "Subtitle text" }

2. "stats" — For numerical data (use 2-4 stats):
   { "type": "stats", "title": "Section Title", "stats": [{"value": "85%", "label": "of adults..."}, ...] }

3. "list" — For bullet points (3-5 items, max 12 words each):
   { "type": "list", "title": "Section Title", "items": ["Item 1", "Item 2", ...] }

4. "comparison" — For contrasting two things:
   { "type": "comparison", "title": "Section Title", "leftColumn": {"heading": "Do", "items": ["item"]}, "rightColumn": {"heading": "Don't", "items": ["item"]} }

5. "process" — For sequential steps (3-6 steps, max 10 words each):
   { "type": "process", "title": "Section Title", "steps": ["Step 1", "Step 2", ...] }

6. "warning" — For cautions/mistakes (1 message + 2-4 callouts):
   { "type": "warning", "title": "Section Title", "message": "Main warning text", "callouts": ["Callout 1", ...] }

7. "cta" — Last slide, always:
   { "type": "cta", "title": "Call to Action Title", "subtitle": "Subscribe for more!", "action": "Like & Subscribe" }

RULES:
- MUST start with "title" and end with "cta"
- Use ALL 7 slide types at least once across the script
- Total 7-12 sections
- Each narrationText: 2-4 sentences, conversational, engaging
- estimatedDuration: seconds for that section (10-30s each)
- totalEstimatedDuration: sum of all section durations
- Slide text must be SHORT — the narration carries the detail
- Keep bullet points/items under 12 words each
- Stats should use real numbers from the research`;

const SHORT_SCRIPT_PROMPT = `You are a SHORT-FORM video script writer. Create a PUNCHY, fast-paced script for TikTok/Shorts/Reels (30-60 seconds total).

IMPORTANT: Your response must be ONLY valid JSON, no markdown fences, no extra text.

Return this exact structure:
{
  "topic": "the topic",
  "sections": [
    {
      "sectionIndex": 0,
      "slideType": "fact",
      "narrationText": "One punchy sentence...",
      "slideData": { ... },
      "estimatedDuration": 4
    }
  ],
  "totalEstimatedDuration": 45
}

SLIDE TYPES AND THEIR slideData FORMATS:

1. "title" — Opening HOOK (not boring title — question, bold claim, or shocking stat):
   { "type": "title", "title": "Did you know...?", "subtitle": "Short teaser" }

2. "fact" — Full-screen bold text, one powerful statement:
   { "type": "fact", "text": "Your brain processes images 60,000x faster than text" }

3. "stat-hero" — One HUGE number with label:
   { "type": "stat-hero", "value": "73%", "label": "of people get this wrong", "source": "Harvard 2024" }

4. "stats" — For numerical data (2-3 stats max):
   { "type": "stats", "title": "Section Title", "stats": [{"value": "85%", "label": "of adults..."}, ...] }

5. "list" — For bullet points (2-3 items max):
   { "type": "list", "title": "Section Title", "items": ["Item 1", "Item 2"] }

6. "warning" — For cautions (1 message + 1-2 callouts):
   { "type": "warning", "title": "Section Title", "message": "Warning text", "callouts": ["Callout"] }

7. "cta" — Last slide, always:
   { "type": "cta", "title": "Follow for more", "subtitle": "Drop a comment!", "action": "Follow" }

SHORT-FORM RULES:
- 8-15 sections (MORE sections, LESS content each)
- 3-8 seconds per section
- 1 sentence MAX narration per section — be CONCISE
- First section = HOOK (question, bold claim, shocking stat) — NOT a boring title
- Last section = CTA (follow, like, comment)
- HEAVILY use "fact" and "stat-hero" types — these are your bread and butter
- Total duration: 30-60 seconds
- Every sentence should make someone want to keep watching
- Use specific numbers, not vague claims
- Narration should feel like talking to a friend, not lecturing`;

export async function generateScript(
  research: ResearchResult,
  jobDir: string,
  mode: VideoMode = 'standard'
): Promise<Script> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const prompt = mode === 'short' ? SHORT_SCRIPT_PROMPT : SCRIPT_PROMPT;

  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Create a video script from this research:\n\n${JSON.stringify(research, null, 2)}\n\n${prompt}`,
      },
    ],
  });

  let resultText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      resultText += block.text;
    }
  }

  // Parse JSON
  let jsonStr = resultText.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  let script: Script;
  try {
    script = JSON.parse(fixJson(jsonStr));
  } catch (e) {
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      fs.writeFileSync(path.join(jobDir, 'script-raw.txt'), resultText);
      throw new Error(
        `Failed to parse script JSON. Raw saved to script-raw.txt`
      );
    }
    script = JSON.parse(fixJson(jsonMatch[0]));
  }

  // Validate slide types (only enforce all 7 standard types in standard mode)
  const slideTypes = new Set(script.sections.map((s) => s.slideType));
  if (mode === 'standard') {
    const requiredTypes: SlideType[] = [
      'title',
      'stats',
      'list',
      'comparison',
      'process',
      'warning',
      'cta',
    ];
    for (const t of requiredTypes) {
      if (!slideTypes.has(t)) {
        console.warn(`Warning: slide type "${t}" missing from script`);
      }
    }
  }

  // Ensure section indices are sequential
  script.sections.forEach((s, i) => {
    s.sectionIndex = i;
  });

  // Recalculate total
  script.totalEstimatedDuration = script.sections.reduce(
    (sum, s) => sum + s.estimatedDuration,
    0
  );

  // Save script
  const scriptPath = path.join(jobDir, 'script.json');
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));

  return script;
}

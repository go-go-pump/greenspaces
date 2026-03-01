import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { ResearchResult, VideoMode } from '../types';

/** Fix common JSON issues from LLM output: trailing commas, truncated endings */
function fixJson(str: string): string {
  // Remove trailing commas before } or ]
  let fixed = str.replace(/,\s*([\]}])/g, '$1');

  // Try to repair truncated JSON by closing open structures
  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    // Remove trailing incomplete string value (e.g. "url truncated here)
    fixed = fixed.replace(/,\s*"[^"]*$/, '');
    // Close any open arrays and objects
    const opens = (fixed.match(/[\[{]/g) || []).length;
    const closes = (fixed.match(/[\]}]/g) || []).length;
    const needed = opens - closes;
    if (needed > 0) {
      // Walk backwards to determine correct closing order
      const stack: string[] = [];
      for (const ch of fixed) {
        if (ch === '{') stack.push('}');
        else if (ch === '[') stack.push(']');
        else if (ch === '}' || ch === ']') stack.pop();
      }
      fixed += stack.reverse().join('');
    }
    return fixed;
  }
}

const RESEARCH_PROMPT = `You are a research assistant preparing information for a video presentation.

Given a topic, research it thoroughly using web search and return a structured JSON object.

IMPORTANT: Your response must be ONLY valid JSON, no markdown fences, no extra text.

Return this exact structure:
{
  "topic": "the topic",
  "summary": "2-3 sentence overview",
  "keyPoints": ["point 1", "point 2", ...],  // 5-8 key takeaways
  "detailedSections": [
    {
      "title": "Section Title",
      "content": "Detailed paragraph about this section...",
      "bulletPoints": ["bullet 1", "bullet 2", ...],  // 3-5 bullets
      "stats": { "stat_name": "stat_value" }  // optional, include when you find real numbers
    }
  ],  // 5-8 sections covering the topic comprehensively
  "sources": ["url1", "url2", ...]  // URLs from your research
}

Guidelines:
- Include REAL statistics, numbers, and data from your research
- Each section should have enough content for a 15-30 second video segment
- Use specific, actionable information — not vague generalities
- Include at least one section with comparative data (pros/cons, before/after, etc.)
- Include at least one section focused on common mistakes or warnings
- The sections should flow logically as a narrative
- Keep the sources array short — only include 3-5 most important URLs
- Keep each section content paragraph to 2-3 sentences max to stay within output limits`;

const SHORT_RESEARCH_PROMPT = `You are a research assistant preparing information for a SHORT-FORM video (30-60 seconds, TikTok/Shorts/Reels).

Given a topic, research it and return a structured JSON object focused on VIRAL, PUNCHY content.

IMPORTANT: Your response must be ONLY valid JSON, no markdown fences, no extra text.

Return this exact structure:
{
  "topic": "the topic",
  "summary": "1 sentence hook — the most shocking/interesting angle",
  "keyPoints": ["point 1", "point 2", ...],  // 3-5 WOW moments, not boring facts
  "detailedSections": [
    {
      "title": "Section Title",
      "content": "One punchy sentence with a specific stat or fact",
      "bulletPoints": ["bullet 1", "bullet 2"],  // 1-3 bullets max
      "stats": { "stat_name": "stat_value" }
    }
  ],  // 3-5 sections, each being ONE wow moment
  "sources": ["url1", "url2"]
}

SHORT-FORM RESEARCH RULES:
- Focus on SHOCKING statistics, counterintuitive truths, "most people don't know" angles
- Every section should make someone stop scrolling
- Find the MOST surprising number or fact for each point
- Keep sections extremely brief — one key insight each
- Prioritize "Did you know?" and "Here's what nobody tells you" style facts
- Include at least 2-3 specific numbers/percentages
- Keep sources to 2-3 max`;

export async function researchTopic(
  topic: string,
  jobDir: string,
  mode: VideoMode = 'standard'
): Promise<ResearchResult> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const prompt = mode === 'short' ? SHORT_RESEARCH_PROMPT : RESEARCH_PROMPT;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
      } as any,
    ],
    messages: [
      {
        role: 'user',
        content: `Research this topic thoroughly for a video presentation: "${topic}"\n\n${prompt}`,
      },
    ],
  });

  // Extract text content from the response
  let resultText = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      resultText += block.text;
    }
  }

  // Parse JSON from the response — strip markdown fences if present
  let jsonStr = resultText.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  let research: ResearchResult;
  try {
    research = JSON.parse(fixJson(jsonStr));
  } catch (e) {
    // If direct parse fails, try to find JSON object in the text
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Save raw response for debugging
      fs.writeFileSync(path.join(jobDir, 'research-raw.txt'), resultText);
      throw new Error(
        `Failed to parse research JSON. Raw response saved to research-raw.txt.\nFirst 500 chars:\n${resultText.slice(0, 500)}`
      );
    }
    try {
      research = JSON.parse(fixJson(jsonMatch[0]));
    } catch (e2) {
      fs.writeFileSync(path.join(jobDir, 'research-raw.txt'), resultText);
      throw new Error(
        `Failed to parse research JSON even after extraction. Raw saved to research-raw.txt.\nParse error: ${e2}`
      );
    }
  }

  // Ensure required fields
  if (!research.topic) research.topic = topic;
  if (!research.sources) research.sources = [];
  if (!research.keyPoints) research.keyPoints = [];
  if (!research.detailedSections) research.detailedSections = [];

  // Save raw research
  const researchPath = path.join(jobDir, 'research.json');
  fs.writeFileSync(researchPath, JSON.stringify(research, null, 2));

  return research;
}

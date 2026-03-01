/**
 * vid-campaign — Keyword research module
 *
 * Uses Claude Haiku with web search to research a keyword/topic
 * and generate video topic variations for a campaign.
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Research a keyword and generate topic variations for video production.
 *
 * @param {string} keyword       - Target keyword to research
 * @param {number} videoCount    - Number of topic variations to generate
 * @param {object} config        - Config with API keys
 * @returns {Promise<object>}    Research results
 */
export async function researchKeyword(keyword, videoCount, config) {
  console.log(`[vid-campaign:research] Researching: "${keyword}" (${videoCount} variations)`);

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const prompt = `You are a YouTube content strategist. Research the keyword "${keyword}" and provide:

1. Estimated monthly search volume (rough estimate)
2. Competition level (low/medium/high)
3. ${videoCount} specific video topic variations that would perform well on YouTube
4. For each variation, a brief angle/hook (1 sentence)

Focus on topics that:
- Have search intent (people actively looking for this)
- Can be answered visually in a 3-5 minute video
- Have a clear, compelling title

Return ONLY valid JSON in this exact format:
{
  "keyword": "${keyword}",
  "volume": <number>,
  "competition": "<low|medium|high>",
  "topicVariations": [
    "Full video title 1",
    "Full video title 2"
  ],
  "angles": [
    "Why this angle works for title 1",
    "Why this angle works for title 2"
  ],
  "trendingRelated": ["related trending topic 1", "related trending topic 2"]
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [{
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: 3,
    }],
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract text from response
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) {
    throw new Error('No text response from research API');
  }

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    const research = JSON.parse(jsonStr.trim());
    console.log(`[vid-campaign:research] Found ${research.topicVariations?.length || 0} topic variations`);
    console.log(`[vid-campaign:research] Competition: ${research.competition}, Volume: ~${research.volume}/mo`);
    return research;
  } catch {
    // Fallback: generate simple variations from the keyword
    console.warn('[vid-campaign:research] Could not parse research JSON, generating fallback variations');
    return {
      keyword,
      volume: 0,
      competition: 'unknown',
      topicVariations: Array.from({ length: videoCount }, (_, i) =>
        `${keyword} — Part ${i + 1}`
      ),
      angles: [],
      trendingRelated: [],
    };
  }
}

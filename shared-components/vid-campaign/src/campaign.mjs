/**
 * vid-campaign — Video campaign lifecycle manager
 *
 * Orchestrates: research → produce (vidgen-pipeline) → publish (vidpub) → monitor
 */

import { randomUUID } from 'node:crypto';
import { researchKeyword } from './research.mjs';
import { loadConfig } from './config.mjs';

const PHASES = ['create', 'research', 'produce', 'publish', 'monitor', 'complete'];

/**
 * Create a new campaign.
 *
 * @param {object} opts
 * @param {string} opts.topic           - Campaign topic/theme
 * @param {string} [opts.keyword]       - Target keyword for research
 * @param {number} [opts.videoCount=3]  - Videos to produce
 * @param {string} [opts.schedule='weekly'] - Publishing schedule
 * @param {boolean} [opts.autoPublish=false]
 * @param {object} [opts.vidgenConfig]  - Passed to vidgen-pipeline
 * @param {object} [opts.vidpubConfig]  - Passed to vidpub
 * @returns {object} Campaign record
 */
export function createCampaign(opts) {
  const campaign = {
    campaignId: randomUUID(),
    topic: opts.topic,
    keyword: opts.keyword || opts.topic,
    status: 'created',
    phase: 'create',
    videoCount: opts.videoCount || 3,
    autoPublish: opts.autoPublish || false,
    vidgenConfig: opts.vidgenConfig || {},
    vidpubConfig: opts.vidpubConfig || {},
    schedule: {
      interval: opts.schedule || 'weekly',
      nextPublishAt: null,
    },
    research: null,
    videos: [],
    totals: {
      videosProduced: 0,
      videosPublished: 0,
      totalViews: 0,
      totalWatchTimeHours: 0,
      totalCostUsd: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log(`[vid-campaign] Created campaign: ${campaign.campaignId}`);
  console.log(`  Topic: ${campaign.topic}`);
  console.log(`  Videos: ${campaign.videoCount}`);
  console.log(`  Schedule: ${campaign.schedule.interval}`);

  return campaign;
}

/**
 * Advance a campaign to its next phase.
 *
 * @param {object} campaign - Campaign record (mutated in place)
 * @param {object} [deps]   - Optional dependency injection
 * @param {Function} [deps.runPipeline] - vidgen-pipeline's runPipeline function
 * @param {Function} [deps.publish]     - vidpub's publish function
 * @returns {Promise<object>} Updated campaign record
 */
export async function advanceCampaign(campaign, deps = {}) {
  const config = loadConfig();
  const currentPhase = campaign.phase;
  const nextIdx = PHASES.indexOf(currentPhase) + 1;

  if (nextIdx >= PHASES.length) {
    console.log(`[vid-campaign] Campaign ${campaign.campaignId} is already complete`);
    return campaign;
  }

  const nextPhase = PHASES[nextIdx];
  console.log(`[vid-campaign] Advancing ${campaign.campaignId}: ${currentPhase} → ${nextPhase}`);

  try {
    switch (nextPhase) {
      case 'research':
        campaign.status = 'researching';
        campaign.phase = 'research';
        campaign.research = await researchKeyword(campaign.keyword, campaign.videoCount, config);
        campaign.research.completedAt = new Date().toISOString();

        // Initialize video slots from research topic variations
        campaign.videos = campaign.research.topicVariations
          .slice(0, campaign.videoCount)
          .map((topic, i) => ({
            index: i,
            topic,
            vidgenJobId: null,
            videoPath: null,
            thumbnailPath: null,
            metadataJson: null,
            status: 'pending',
            youtubeVideoId: null,
            youtubeUrl: null,
            metrics: null,
            costUsd: 0,
          }));
        break;

      case 'produce':
        campaign.status = 'producing';
        campaign.phase = 'produce';
        await produceVideos(campaign, deps);
        break;

      case 'publish':
        campaign.status = 'publishing';
        campaign.phase = 'publish';
        await publishVideos(campaign, deps);
        break;

      case 'monitor':
        campaign.status = 'monitoring';
        campaign.phase = 'monitor';
        // Monitoring is ongoing — this phase marks the campaign as in monitoring state
        console.log(`[vid-campaign] Campaign ${campaign.campaignId} is now being monitored`);
        break;

      case 'complete':
        campaign.status = 'complete';
        campaign.phase = 'complete';
        summarizeCampaign(campaign);
        break;
    }
  } catch (err) {
    campaign.status = 'failed';
    campaign.errorMessage = err.message;
    console.error(`[vid-campaign] Phase ${nextPhase} failed: ${err.message}`);
  }

  campaign.updatedAt = new Date().toISOString();
  return campaign;
}

/**
 * Run a full campaign from start to finish.
 *
 * @param {object} opts - Same as createCampaign options
 * @param {object} [deps] - Dependency injection for vidgen/vidpub
 * @returns {Promise<object>} Completed campaign record
 */
export async function runCampaign(opts, deps = {}) {
  let campaign = createCampaign(opts);

  for (const phase of PHASES.slice(1)) {
    if (campaign.status === 'failed') break;
    campaign = await advanceCampaign(campaign, deps);

    // Skip publish if not auto-publish
    if (phase === 'publish' && !campaign.autoPublish) {
      console.log(`[vid-campaign] Auto-publish disabled. Skipping publish phase.`);
      campaign.phase = 'publish'; // stay at publish, don't advance
      break;
    }
  }

  return campaign;
}

/**
 * Get a summary of campaign status.
 */
export function getCampaignStatus(campaign) {
  return {
    campaignId: campaign.campaignId,
    topic: campaign.topic,
    status: campaign.status,
    phase: campaign.phase,
    videosProduced: campaign.videos.filter(v => v.status === 'produced' || v.status === 'published').length,
    videosPublished: campaign.videos.filter(v => v.status === 'published').length,
    totalVideos: campaign.videos.length,
    totalCostUsd: campaign.totals.totalCostUsd,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

// --- Internal ---

async function produceVideos(campaign, deps) {
  const runPipeline = deps.runPipeline || (await loadVidgen());

  for (const video of campaign.videos) {
    if (video.status !== 'pending') continue;

    console.log(`[vid-campaign] Producing video ${video.index + 1}/${campaign.videos.length}: ${video.topic}`);

    try {
      const result = await runPipeline({
        topic: video.topic,
        ...campaign.vidgenConfig,
      });

      video.vidgenJobId = result.jobId || null;
      video.videoPath = result.outputDir ? `${result.outputDir}/video.mp4` : null;
      video.thumbnailPath = result.outputDir ? `${result.outputDir}/thumbnail.jpg` : null;
      video.metadataJson = result.metadata || null;
      video.status = 'produced';
      video.costUsd = result.cost?.total || 0;
      campaign.totals.videosProduced++;
      campaign.totals.totalCostUsd += video.costUsd;

      console.log(`[vid-campaign] Video ${video.index + 1} produced (cost: $${video.costUsd.toFixed(2)})`);
    } catch (err) {
      video.status = 'failed';
      video.errorMessage = err.message;
      console.error(`[vid-campaign] Video ${video.index + 1} failed: ${err.message}`);
    }
  }
}

async function publishVideos(campaign, deps) {
  const publishFn = deps.publish || (await loadVidpub());

  for (const video of campaign.videos) {
    if (video.status !== 'produced') continue;

    console.log(`[vid-campaign] Publishing video ${video.index + 1}: ${video.topic}`);

    try {
      const metadata = video.metadataJson || {};
      const result = await publishFn({
        videoPath: video.videoPath,
        title: metadata.title || video.topic,
        description: metadata.description || '',
        tags: metadata.tags || [],
        thumbnailPath: video.thumbnailPath,
        ...campaign.vidpubConfig,
      });

      if (result.status === 'failed') {
        throw new Error(result.error || 'Publish failed');
      }

      video.youtubeVideoId = result.videoId;
      video.youtubeUrl = result.url;
      video.status = 'published';
      campaign.totals.videosPublished++;

      console.log(`[vid-campaign] Video ${video.index + 1} published: ${result.url}`);
    } catch (err) {
      video.status = 'failed';
      video.errorMessage = err.message;
      console.error(`[vid-campaign] Publish failed for video ${video.index + 1}: ${err.message}`);
    }
  }
}

function summarizeCampaign(campaign) {
  const produced = campaign.videos.filter(v => v.status === 'produced' || v.status === 'published').length;
  const published = campaign.videos.filter(v => v.status === 'published').length;

  campaign.totals.videosProduced = produced;
  campaign.totals.videosPublished = published;

  console.log(`[vid-campaign] Campaign ${campaign.campaignId} COMPLETE`);
  console.log(`  Videos produced:  ${produced}/${campaign.videos.length}`);
  console.log(`  Videos published: ${published}/${campaign.videos.length}`);
  console.log(`  Total cost:       $${campaign.totals.totalCostUsd.toFixed(2)}`);
}

async function loadVidgen() {
  const config = loadConfig();
  try {
    const mod = await import(config.vidgenPath + '/src/pipeline.ts');
    return mod.runPipeline;
  } catch {
    throw new Error(`vidgen-pipeline not found at ${config.vidgenPath}. Set VIDGEN_PATH or install as dependency.`);
  }
}

async function loadVidpub() {
  const config = loadConfig();
  try {
    const mod = await import(config.vidpubPath + '/src/publish.mjs');
    return mod.publish;
  } catch {
    throw new Error(`vidpub not found at ${config.vidpubPath}. Set VIDPUB_PATH or install as dependency.`);
  }
}

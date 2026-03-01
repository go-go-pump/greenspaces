/**
 * vidpub — YouTube Data API v3 upload
 *
 * Uses OAuth2 with refresh token for resumable video uploads.
 * Handles metadata, thumbnails, playlist insertion, and scheduling.
 */

import { google } from 'googleapis';
import { createReadStream, statSync } from 'node:fs';

/**
 * Upload a video via YouTube Data API v3.
 *
 * @param {object} params - Upload parameters (see publish.mjs)
 * @param {object} config - Credentials config
 * @returns {Promise<object>} Upload result
 */
export async function uploadViaApi(params, config) {
  const oauth2Client = new google.auth.OAuth2(
    config.youtubeClientId,
    config.youtubeClientSecret,
  );

  oauth2Client.setCredentials({
    refresh_token: config.youtubeRefreshToken,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // Build video resource
  const resource = {
    snippet: {
      title: params.title,
      description: params.description,
      tags: params.tags,
      categoryId: String(params.categoryId),
      defaultLanguage: params.language,
      defaultAudioLanguage: params.language,
    },
    status: {
      privacyStatus: params.privacy,
      selfDeclaredMadeForKids: false,
    },
  };

  // Scheduled publishing
  if (params.scheduleAt) {
    resource.status.privacyStatus = 'private';
    resource.status.publishAt = params.scheduleAt;
  }

  // Notify subscribers
  const notifySubscribers = params.notifySubscribers;

  console.log(`[vidpub:api] Uploading: ${params.title}`);
  const fileSize = statSync(params.videoPath).size;
  console.log(`[vidpub:api] File size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

  // Resumable upload
  const uploadResponse = await youtube.videos.insert({
    part: ['snippet', 'status'],
    notifySubscribers,
    requestBody: resource,
    media: {
      body: createReadStream(params.videoPath),
    },
  });

  const videoId = uploadResponse.data.id;
  const channelId = uploadResponse.data.snippet?.channelId;
  console.log(`[vidpub:api] Upload complete: ${videoId}`);

  let thumbnailUrl = null;
  let quotaUsed = 1600; // base upload cost

  // Upload custom thumbnail (costs 50 quota units)
  if (params.thumbnailPath) {
    try {
      const thumbResponse = await youtube.thumbnails.set({
        videoId,
        media: {
          body: createReadStream(params.thumbnailPath),
        },
      });
      thumbnailUrl = thumbResponse.data?.items?.[0]?.default?.url || null;
      quotaUsed += 50;
      console.log(`[vidpub:api] Thumbnail uploaded`);
    } catch (err) {
      console.warn(`[vidpub:api] Thumbnail upload failed: ${err.message}`);
    }
  }

  // Add to playlist (costs 50 quota units)
  if (params.playlistId) {
    try {
      await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: params.playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        },
      });
      quotaUsed += 50;
      console.log(`[vidpub:api] Added to playlist: ${params.playlistId}`);
    } catch (err) {
      console.warn(`[vidpub:api] Playlist insertion failed: ${err.message}`);
    }
  }

  const status = params.scheduleAt ? 'scheduled' : 'published';

  return {
    videoId,
    channelId,
    status,
    publishedAt: params.scheduleAt || new Date().toISOString(),
    thumbnailUrl,
    quotaUsed,
  };
}

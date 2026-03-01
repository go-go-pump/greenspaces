/**
 * vidpub — Configuration loader
 *
 * Reads credentials from environment variables.
 * Supports .env files in the component root.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Load .env file if present (simple key=value parser, no interpolation).
 */
function loadDotenv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

/**
 * Load and validate configuration from environment.
 * @returns {object} Configuration object
 */
export function loadConfig() {
  loadDotenv();

  const config = {
    // YouTube Data API v3
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID || '',
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',

    // Puppeteer fallback
    googleEmail: process.env.GOOGLE_EMAIL || '',
    googlePassword: process.env.GOOGLE_PASSWORD || '',

    // Derived flags
    hasApiCredentials: false,
    hasPuppeteerCredentials: false,
  };

  config.hasApiCredentials = !!(
    config.youtubeClientId &&
    config.youtubeClientSecret &&
    config.youtubeRefreshToken
  );

  config.hasPuppeteerCredentials = !!(
    config.googleEmail &&
    config.googlePassword
  );

  return config;
}

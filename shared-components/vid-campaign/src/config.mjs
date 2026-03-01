/**
 * vid-campaign — Configuration loader
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHARED_COMPONENTS = resolve(ROOT, '..');

/**
 * Load .env file if present.
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
 * Load and validate configuration.
 * @returns {object} Config
 */
export function loadConfig() {
  loadDotenv();

  const config = {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

    // Sibling component paths (default to shared-components/ layout)
    vidgenPath: process.env.VIDGEN_PATH || resolve(SHARED_COMPONENTS, 'vidgen-pipeline'),
    vidpubPath: process.env.VIDPUB_PATH || resolve(SHARED_COMPONENTS, 'vidpub'),
  };

  if (!config.anthropicApiKey) {
    console.warn('[vid-campaign] ANTHROPIC_API_KEY not set — research phase will fail');
  }

  return config;
}

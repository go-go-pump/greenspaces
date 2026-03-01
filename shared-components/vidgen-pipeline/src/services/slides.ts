import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { config } from '../config';
import { DEFAULT_STYLE } from '../presets/styles';
import {
  StyleGuide,
  ScriptSection,
  SlideImage,
  SlideData,
  TitleSlideData,
  StatsSlideData,
  ListSlideData,
  ComparisonSlideData,
  ProcessSlideData,
  WarningSlideData,
  CtaSlideData,
  FactSlideData,
  StatHeroSlideData,
} from '../types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate a <style> block from a StyleGuide that overrides template defaults
 * via CSS custom properties.
 */
function buildStyleOverrides(style: StyleGuide, width = 1920, height = 1080): string {
  return `<style>
  :root {
    --color-primary: ${style.colors.primary};
    --color-secondary: ${style.colors.secondary};
    --color-bg: ${style.colors.background};
    --color-bg-end: ${style.colors.backgroundEnd};
    --color-text: ${style.colors.text};
    --color-text-muted: ${style.colors.textMuted};
    --color-positive: ${style.colors.positive};
    --color-negative: ${style.colors.negative};
    --color-warning: ${style.colors.warning};
    --font-family: ${style.fonts.family};
    --font-title-size: ${style.fonts.titleSize};
    --font-heading-size: ${style.fonts.headingSize};
    --font-body-size: ${style.fonts.bodySize};
    --font-stat-size: ${style.fonts.statSize};
    --font-title-weight: ${style.fonts.titleWeight};
    --font-body-weight: ${style.fonts.bodyWeight};
    --layout-padding: ${style.layout.padding};
    --layout-radius: ${style.layout.borderRadius};
    --layout-card-bg: ${style.layout.cardBackground};
    --layout-card-border: ${style.layout.cardBorder};
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${width}px; height: ${height}px;
    background: linear-gradient(135deg, var(--color-bg), var(--color-bg-end));
    font-family: var(--font-family);
    color: var(--color-text);
    overflow: hidden;
    display: flex; flex-direction: column; justify-content: center; align-items: center;${height > width ? `
    padding-bottom: ${Math.round(height * 0.5)}px;` : ''}
  }
</style>`;
}

function buildSlideHtml(data: SlideData, style: StyleGuide, width = 1920, height = 1080): string {
  const overrides = buildStyleOverrides(style, width, height);
  const isPortrait = height > width;

  switch (data.type) {
    case 'title':
      return buildTitleSlide(data, overrides, style, isPortrait);
    case 'stats':
      return buildStatsSlide(data, overrides, style, isPortrait);
    case 'list':
      return buildListSlide(data, overrides, style, isPortrait);
    case 'comparison':
      return buildComparisonSlide(data, overrides, style, isPortrait);
    case 'process':
      return buildProcessSlide(data, overrides, style, isPortrait);
    case 'warning':
      return buildWarningSlide(data, overrides, style, isPortrait);
    case 'cta':
      return buildCtaSlide(data, overrides, style, isPortrait);
    case 'fact':
      return buildFactSlide(data, overrides, style, isPortrait);
    case 'stat-hero':
      return buildStatHeroSlide(data, overrides, style, isPortrait);
  }
}

function buildTitleSlide(d: TitleSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .title {
    font-size: ${isPortrait ? '80px' : 'var(--font-title-size)'}; font-weight: var(--font-title-weight);
    text-align: center; max-width: ${isPortrait ? '950px' : '1400px'}; line-height: 1.2; margin-bottom: 30px;
    text-shadow: 0 4px 20px rgba(0,0,0,0.5);
  }
  .subtitle {
    font-size: ${isPortrait ? '40px' : '36px'}; font-weight: 300; text-align: center; max-width: ${isPortrait ? '900px' : '1200px'};
    color: var(--color-text-muted); line-height: 1.4;
  }
  .accent-line {
    width: 120px; height: 4px;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 2px; margin: 30px 0;
  }
</style></head><body>
  <div class="title">${escapeHtml(d.title)}</div>
  <div class="accent-line"></div>
  <div class="subtitle">${escapeHtml(d.subtitle)}</div>
</body></html>`;
}

function buildStatsSlide(d: StatsSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  const statsHtml = d.stats.slice(0, 4).map(st =>
    `<div class="stat-card"><div class="stat-value">${escapeHtml(st.value)}</div><div class="stat-label">${escapeHtml(st.label)}</div></div>`
  ).join('');
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: var(--layout-padding); }
  .section-title { font-size: ${isPortrait ? '60px' : 'var(--font-heading-size)'}; font-weight: var(--font-title-weight); margin-bottom: ${isPortrait ? '50px' : '60px'}; text-align: center; }
  .stats-grid { display: grid; grid-template-columns: ${isPortrait ? '1fr' : 'repeat(2, 1fr)'}; gap: ${isPortrait ? '35px' : '50px'}; width: 100%; max-width: ${isPortrait ? '900px' : '1400px'}; ${isPortrait ? 'max-height: 1500px; overflow: hidden;' : ''} }
  .stat-card {
    background: var(--layout-card-bg); border: 1px solid var(--layout-card-border);
    border-radius: var(--layout-radius); padding: ${isPortrait ? '45px 35px' : '50px 40px'}; text-align: center;
  }
  .stat-value {
    font-size: ${isPortrait ? '64px' : 'var(--font-stat-size)'}; font-weight: 800;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 15px;
  }
  .stat-label { font-size: ${isPortrait ? '32px' : '26px'}; color: var(--color-text-muted); font-weight: var(--font-body-weight); line-height: 1.3; }
</style></head><body>
  <div class="section-title">${escapeHtml(d.title)}</div>
  <div class="stats-grid">${statsHtml}</div>
</body></html>`;
}

function buildListSlide(d: ListSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  const itemsHtml = d.items.slice(0, 5).map(item =>
    `<div class="list-item"><div class="list-icon">&#9658;</div><div class="list-text">${escapeHtml(item)}</div></div>`
  ).join('');
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; padding: var(--layout-padding) ${isPortrait ? '60px' : '120px'}; }
  .section-title { font-size: ${isPortrait ? '60px' : '52px'}; font-weight: var(--font-title-weight); margin-bottom: ${isPortrait ? '50px' : '50px'}; }
  .list-container { width: 100%; ${isPortrait ? 'max-height: 1500px; overflow: hidden;' : ''} }
  .list-item {
    display: flex; align-items: flex-start; margin-bottom: ${isPortrait ? '28px' : '30px'}; padding: ${isPortrait ? '24px 30px' : '20px 30px'};
    background: var(--layout-card-bg); border-left: 4px solid var(--color-primary);
    border-radius: 0 var(--layout-radius) var(--layout-radius) 0;
  }
  .list-icon { font-size: ${isPortrait ? '40px' : '28px'}; margin-right: 20px; color: var(--color-primary); flex-shrink: 0; margin-top: 2px; }
  .list-text { font-size: ${isPortrait ? '38px' : 'var(--font-body-size)'}; line-height: 1.4; color: var(--color-text-muted); font-weight: var(--font-body-weight); }
</style></head><body>
  <div class="section-title">${escapeHtml(d.title)}</div>
  <div class="list-container">${itemsHtml}</div>
</body></html>`;
}

function buildComparisonSlide(d: ComparisonSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  const leftHtml = d.leftColumn.items.map(i => `<div class="column-item">${escapeHtml(i)}</div>`).join('');
  const rightHtml = d.rightColumn.items.map(i => `<div class="column-item">${escapeHtml(i)}</div>`).join('');
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: var(--layout-padding); }
  .section-title { font-size: ${isPortrait ? '56px' : 'var(--font-heading-size)'}; font-weight: var(--font-title-weight); margin-bottom: ${isPortrait ? '40px' : '50px'}; text-align: center; }
  .columns { display: flex; flex-direction: ${isPortrait ? 'column' : 'row'}; gap: ${isPortrait ? '30px' : '40px'}; width: 100%; max-width: ${isPortrait ? '950px' : '1500px'}; flex: 1; }
  .column { flex: 1; border-radius: var(--layout-radius); padding: ${isPortrait ? '35px' : '40px'}; display: flex; flex-direction: column; }
  .column-left { background: rgba(${hexToRgb(s.colors.positive)}, 0.12); border: 2px solid rgba(${hexToRgb(s.colors.positive)}, 0.4); }
  .column-right { background: rgba(${hexToRgb(s.colors.negative)}, 0.12); border: 2px solid rgba(${hexToRgb(s.colors.negative)}, 0.4); }
  .column-heading { font-size: ${isPortrait ? '42px' : '36px'}; font-weight: var(--font-title-weight); margin-bottom: ${isPortrait ? '24px' : '30px'}; text-align: center; }
  .column-left .column-heading { color: var(--color-positive); }
  .column-right .column-heading { color: var(--color-negative); }
  .column-item { font-size: ${isPortrait ? '38px' : '28px'}; line-height: 1.4; margin-bottom: ${isPortrait ? '18px' : '20px'}; padding-left: 20px; position: relative; color: var(--color-text-muted); }
  .column-item::before { content: ''; position: absolute; left: 0; top: ${isPortrait ? '16px' : '12px'}; width: 8px; height: 8px; border-radius: 50%; }
  .column-left .column-item::before { background: var(--color-positive); }
  .column-right .column-item::before { background: var(--color-negative); }
</style></head><body>
  <div class="section-title">${escapeHtml(d.title)}</div>
  <div class="columns">
    <div class="column column-left">
      <div class="column-heading">${escapeHtml(d.leftColumn.heading)}</div>
      ${leftHtml}
    </div>
    <div class="column column-right">
      <div class="column-heading">${escapeHtml(d.rightColumn.heading)}</div>
      ${rightHtml}
    </div>
  </div>
</body></html>`;
}

function buildProcessSlide(d: ProcessSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  const stepsHtml = d.steps.slice(0, 6).map((step, i) => {
    const block = `<div class="step"><div class="step-number">${i + 1}</div><div class="step-text">${escapeHtml(step)}</div></div>`;
    const connector = i < d.steps.length - 1 ? '<div class="step-connector"></div>' : '';
    return block + connector;
  }).join('');
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: var(--layout-padding); }
  .section-title { font-size: ${isPortrait ? '60px' : 'var(--font-heading-size)'}; font-weight: var(--font-title-weight); margin-bottom: ${isPortrait ? '45px' : '50px'}; text-align: center; }
  .steps-container { display: flex; flex-direction: column; gap: ${isPortrait ? '16px' : '12px'}; width: 100%; max-width: ${isPortrait ? '950px' : '1200px'}; ${isPortrait ? 'max-height: 1500px; overflow: hidden;' : ''} }
  .step {
    display: flex; align-items: center; padding: ${isPortrait ? '28px 30px' : '24px 32px'};
    background: var(--layout-card-bg); border-radius: var(--layout-radius); position: relative;
  }
  .step-number {
    width: ${isPortrait ? '64px' : '56px'}; height: ${isPortrait ? '64px' : '56px'};
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    border-radius: 50%; display: flex; justify-content: center; align-items: center;
    font-size: ${isPortrait ? '30px' : '26px'}; font-weight: 700; flex-shrink: 0; margin-right: ${isPortrait ? '24px' : '28px'};
  }
  .step-text { font-size: ${isPortrait ? '36px' : '30px'}; color: var(--color-text-muted); line-height: 1.3; }
  .step-connector { width: 3px; height: 12px; background: rgba(${hexToRgb(s.colors.primary)}, 0.4); margin-left: ${isPortrait ? '91px' : '107px'}; }
</style></head><body>
  <div class="section-title">${escapeHtml(d.title)}</div>
  <div class="steps-container">${stepsHtml}</div>
</body></html>`;
}

function buildWarningSlide(d: WarningSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  const calloutsHtml = d.callouts.slice(0, 4).map(c =>
    `<div class="callout"><div class="callout-icon">&#9888;</div><div class="callout-text">${escapeHtml(c)}</div></div>`
  ).join('');
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: var(--layout-padding); }
  .section-title { font-size: ${isPortrait ? '56px' : 'var(--font-heading-size)'}; font-weight: var(--font-title-weight); margin-bottom: 40px; text-align: center; color: var(--color-warning); }
  .warning-box {
    width: 100%; max-width: ${isPortrait ? '950px' : '1400px'}; border: 3px solid rgba(${hexToRgb(s.colors.warning)}, 0.6);
    border-radius: 24px; padding: ${isPortrait ? '40px' : '50px'}; background: rgba(${hexToRgb(s.colors.warning)}, 0.08);
    ${isPortrait ? 'max-height: 1500px; overflow: hidden;' : ''}
  }
  .warning-icon { font-size: ${isPortrait ? '64px' : '60px'}; text-align: center; margin-bottom: 20px; }
  .warning-message { font-size: ${isPortrait ? '38px' : '34px'}; text-align: center; color: var(--color-text-muted); margin-bottom: ${isPortrait ? '35px' : '40px'}; line-height: 1.4; }
  .callouts { display: flex; flex-direction: column; gap: ${isPortrait ? '18px' : '18px'}; }
  .callout {
    display: flex; align-items: flex-start; padding: ${isPortrait ? '22px 28px' : '18px 24px'};
    background: rgba(${hexToRgb(s.colors.warning)}, 0.1); border-left: 4px solid var(--color-warning);
    border-radius: 0 var(--layout-radius) var(--layout-radius) 0;
  }
  .callout-icon { font-size: ${isPortrait ? '36px' : '24px'}; margin-right: 16px; color: var(--color-warning); flex-shrink: 0; }
  .callout-text { font-size: ${isPortrait ? '38px' : '28px'}; color: var(--color-text-muted); line-height: 1.3; }
</style></head><body>
  <div class="section-title">${escapeHtml(d.title)}</div>
  <div class="warning-box">
    <div class="warning-icon">&#9888;</div>
    <div class="warning-message">${escapeHtml(d.message)}</div>
    <div class="callouts">${calloutsHtml}</div>
  </div>
</body></html>`;
}

function buildCtaSlide(d: CtaSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .cta-title {
    font-size: ${isPortrait ? '64px' : '56px'}; font-weight: var(--font-title-weight); text-align: center;
    max-width: ${isPortrait ? '950px' : '1200px'}; margin-bottom: 24px; line-height: 1.2;
  }
  .cta-subtitle {
    font-size: ${isPortrait ? '38px' : 'var(--font-body-size)'}; color: var(--color-text-muted); text-align: center;
    max-width: ${isPortrait ? '900px' : '1000px'}; margin-bottom: 50px; line-height: 1.4;
  }
  .cta-button {
    display: inline-block; padding: ${isPortrait ? '26px 56px' : '22px 64px'};
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    border-radius: 50px; font-size: ${isPortrait ? '38px' : 'var(--font-body-size)'}; font-weight: 700; letter-spacing: 1px;
    box-shadow: 0 8px 30px rgba(${hexToRgb(s.colors.primary)}, 0.4);
  }
</style></head><body>
  <div class="cta-title">${escapeHtml(d.title)}</div>
  <div class="cta-subtitle">${escapeHtml(d.subtitle)}</div>
  <div class="cta-button">${escapeHtml(d.action)}</div>
</body></html>`;
}

function buildFactSlide(d: FactSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: ${isPortrait ? '60px' : '120px'}; }
  .fact-text {
    font-size: ${isPortrait ? '60px' : '64px'}; font-weight: 900;
    text-align: center; max-width: ${isPortrait ? '950px' : '1400px'}; line-height: 1.3;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 4px 30px rgba(0,0,0,0.5));
  }
</style></head><body>
  <div class="fact-text">${escapeHtml(d.text)}</div>
</body></html>`;
}

function buildStatHeroSlide(d: StatHeroSlideData, overrides: string, s: StyleGuide, isPortrait = false): string {
  const sourceHtml = d.source ? `<div class="stat-source">${escapeHtml(d.source)}</div>` : '';
  return `<!DOCTYPE html><html><head>${overrides}
<style>
  body { display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .hero-value {
    font-size: ${isPortrait ? '120px' : 'var(--font-stat-size)'}; font-weight: 900;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    line-height: 1.1; margin-bottom: 20px;
  }
  .hero-label {
    font-size: ${isPortrait ? '42px' : '40px'}; font-weight: 700;
    color: var(--color-text-muted); text-align: center;
    max-width: ${isPortrait ? '900px' : '1200px'}; line-height: 1.3;
  }
  .stat-source {
    font-size: ${isPortrait ? '28px' : '22px'}; color: rgba(255,255,255,0.4);
    margin-top: 30px; font-weight: 400;
  }
</style></head><body>
  <div class="hero-value">${escapeHtml(d.value)}</div>
  <div class="hero-label">${escapeHtml(d.label)}</div>
  ${sourceHtml}
</body></html>`;
}

/** Convert hex color to "r,g,b" string for rgba() usage */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

export async function renderSlides(
  sections: ScriptSection[],
  jobDir: string,
  style: StyleGuide = DEFAULT_STYLE,
  resolution?: { width: number; height: number }
): Promise<SlideImage[]> {
  const W = resolution?.width ?? config.videoWidth;
  const H = resolution?.height ?? config.videoHeight;
  const slidesDir = path.join(jobDir, 'slides');
  fs.mkdirSync(slidesDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'shell',
    protocolTimeout: 180000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  const results: SlideImage[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H });

    for (const section of sections) {
      console.log(
        `  Rendering slide ${section.sectionIndex}: ${section.slideType}`
      );
      const html = buildSlideHtml(section.slideData, style, W, H);
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const filePath = path.join(
        slidesDir,
        `slide-${String(section.sectionIndex).padStart(3, '0')}.png`
      );
      await page.screenshot({ path: filePath, type: 'png' });

      results.push({
        sectionIndex: section.sectionIndex,
        filePath,
        width: W,
        height: H,
      });
    }
  } finally {
    await browser.close();
  }

  return results;
}

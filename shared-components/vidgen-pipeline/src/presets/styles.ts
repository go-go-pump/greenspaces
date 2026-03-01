import { StyleGuide } from '../types';

export const DEFAULT_STYLE: StyleGuide = {
  name: 'default',
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    background: '#0f0c29',
    backgroundEnd: '#24243e',
    text: '#ffffff',
    textMuted: '#b8b5ff',
    positive: '#48c78e',
    negative: '#ff6363',
    warning: '#ffb347',
  },
  fonts: {
    family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    titleSize: '72px',
    headingSize: '48px',
    bodySize: '32px',
    statSize: '72px',
    titleWeight: '700',
    bodyWeight: '400',
  },
  layout: {
    padding: '80px',
    borderRadius: '20px',
    cardBackground: 'rgba(255,255,255,0.08)',
    cardBorder: 'rgba(255,255,255,0.15)',
  },
  transition: {
    type: 'none',
    durationMs: 0,
  },
};

export const CORPORATE_STYLE: StyleGuide = {
  name: 'corporate',
  colors: {
    primary: '#2563eb',
    secondary: '#1e40af',
    background: '#0f172a',
    backgroundEnd: '#1e293b',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    positive: '#22c55e',
    negative: '#ef4444',
    warning: '#f59e0b',
  },
  fonts: {
    family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    titleSize: '68px',
    headingSize: '46px',
    bodySize: '30px',
    statSize: '68px',
    titleWeight: '700',
    bodyWeight: '400',
  },
  layout: {
    padding: '80px',
    borderRadius: '12px',
    cardBackground: 'rgba(255,255,255,0.05)',
    cardBorder: 'rgba(255,255,255,0.10)',
  },
  transition: {
    type: 'none',
    durationMs: 0,
  },
};

export const VIBRANT_STYLE: StyleGuide = {
  name: 'vibrant',
  colors: {
    primary: '#f97316',
    secondary: '#ec4899',
    background: '#042f2e',
    backgroundEnd: '#3b0764',
    text: '#ffffff',
    textMuted: '#c4b5fd',
    positive: '#34d399',
    negative: '#fb7185',
    warning: '#fbbf24',
  },
  fonts: {
    family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    titleSize: '76px',
    headingSize: '50px',
    bodySize: '32px',
    statSize: '76px',
    titleWeight: '800',
    bodyWeight: '400',
  },
  layout: {
    padding: '80px',
    borderRadius: '24px',
    cardBackground: 'rgba(255,255,255,0.10)',
    cardBorder: 'rgba(255,255,255,0.20)',
  },
  transition: {
    type: 'none',
    durationMs: 0,
  },
};

export const MINIMAL_STYLE: StyleGuide = {
  name: 'minimal',
  colors: {
    primary: '#a1a1aa',
    secondary: '#71717a',
    background: '#09090b',
    backgroundEnd: '#18181b',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    positive: '#4ade80',
    negative: '#f87171',
    warning: '#fcd34d',
  },
  fonts: {
    family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    titleSize: '64px',
    headingSize: '44px',
    bodySize: '28px',
    statSize: '64px',
    titleWeight: '600',
    bodyWeight: '300',
  },
  layout: {
    padding: '100px',
    borderRadius: '8px',
    cardBackground: 'rgba(255,255,255,0.04)',
    cardBorder: 'rgba(255,255,255,0.08)',
  },
  transition: {
    type: 'none',
    durationMs: 0,
  },
};

export const WARM_STYLE: StyleGuide = {
  name: 'warm',
  colors: {
    primary: '#d97706',
    secondary: '#b45309',
    background: '#1c1917',
    backgroundEnd: '#292524',
    text: '#fef3c7',
    textMuted: '#d6d3d1',
    positive: '#65a30d',
    negative: '#dc2626',
    warning: '#f59e0b',
  },
  fonts: {
    family: "Georgia, 'Times New Roman', serif",
    titleSize: '70px',
    headingSize: '48px',
    bodySize: '30px',
    statSize: '70px',
    titleWeight: '700',
    bodyWeight: '400',
  },
  layout: {
    padding: '80px',
    borderRadius: '16px',
    cardBackground: 'rgba(255,255,255,0.06)',
    cardBorder: 'rgba(255,255,255,0.12)',
  },
  transition: {
    type: 'none',
    durationMs: 0,
  },
};

export const SHORT_STYLE: StyleGuide = {
  name: 'short',
  colors: {
    primary: '#ff6b35',
    secondary: '#ec4899',
    background: '#0a0a0a',
    backgroundEnd: '#1a0a1e',
    text: '#ffffff',
    textMuted: '#e0d0ff',
    positive: '#34d399',
    negative: '#fb7185',
    warning: '#fbbf24',
  },
  fonts: {
    family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    titleSize: '96px',
    headingSize: '72px',
    bodySize: '48px',
    statSize: '120px',
    titleWeight: '900',
    bodyWeight: '700',
  },
  layout: {
    padding: '60px',
    borderRadius: '0px',
    cardBackground: 'transparent',
    cardBorder: 'transparent',
  },
  transition: {
    type: 'fade',
    durationMs: 200,
  },
};

export const STYLE_PRESETS: Record<string, StyleGuide> = {
  default: DEFAULT_STYLE,
  corporate: CORPORATE_STYLE,
  vibrant: VIBRANT_STYLE,
  minimal: MINIMAL_STYLE,
  warm: WARM_STYLE,
  short: SHORT_STYLE,
};

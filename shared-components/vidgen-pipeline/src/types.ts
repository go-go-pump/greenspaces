// ─── Style Guide ────────────────────────────────────────────────

export interface StyleGuide {
  name: string;
  colors: {
    primary: string;       // main accent color (e.g., "#667eea")
    secondary: string;     // secondary accent (e.g., "#764ba2")
    background: string;    // gradient start (e.g., "#0f0c29")
    backgroundEnd: string; // gradient end (e.g., "#24243e")
    text: string;          // primary text (e.g., "#ffffff")
    textMuted: string;     // secondary text (e.g., "#b8b5ff")
    positive: string;      // comparison good side (e.g., "#48c78e")
    negative: string;      // comparison bad side (e.g., "#ff6363")
    warning: string;       // warning accent (e.g., "#ffb347")
  };
  fonts: {
    family: string;        // CSS font-family string
    titleSize: string;     // e.g., "72px"
    headingSize: string;   // e.g., "48px"
    bodySize: string;      // e.g., "32px"
    statSize: string;      // e.g., "72px"
    titleWeight: string;   // e.g., "700"
    bodyWeight: string;    // e.g., "400"
  };
  layout: {
    padding: string;       // outer padding (e.g., "80px")
    borderRadius: string;  // card rounding (e.g., "20px")
    cardBackground: string; // rgba card bg (e.g., "rgba(255,255,255,0.08)")
    cardBorder: string;    // card border (e.g., "rgba(255,255,255,0.15)")
  };
  transition: {
    type: 'none' | 'fade' | 'slide';
    durationMs: number;
  };
}

// ─── Voice Profile ──────────────────────────────────────────────

export interface VoiceProfile {
  name: string;
  personality: string;     // e.g., "professional", "friendly"
  archetype: string;       // e.g., "news anchor", "teacher"
  accent: string;          // e.g., "American", "British"
  speed: 'slow' | 'normal' | 'fast';
  tone: 'formal' | 'conversational' | 'enthusiastic';
  edgeTtsVoice: string;    // mapped edge-tts voice ID
  edgeTtsRate: string;     // e.g., "+0%", "-10%", "+15%"
}

// ─── Layer 2: Image Generation ──────────────────────────────────

export interface ImageConfig {
  enabled: boolean;
  provider: 'openai';
  /** Generate an image every N slides (0 = disabled). Title/CTA slides skipped. */
  frequency: number;
  /** Image style prompt suffix, e.g. "digital illustration, vibrant colors" */
  stylePrompt: string;
  /** OpenAI image size */
  size: '1024x1024' | '1792x1024' | '1024x1792';
  /** OpenAI quality */
  quality: 'standard' | 'hd';
  /** How images appear on slides */
  placement: 'background' | 'side' | 'overlay' | 'fullscreen';
  /** Opacity when placement is overlay (0-1) */
  overlayOpacity: number;
}

export interface GeneratedImage {
  sectionIndex: number;
  filePath: string;
  prompt: string;
}

// ─── Layer 3: B-Roll Video ──────────────────────────────────────

export interface BRollConfig {
  enabled: boolean;
  provider: 'pexels';
  /** Insert a B-roll clip every N slides (0 = disabled) */
  frequency: number;
  /** Max clip duration in seconds */
  clipDuration: number;
  /** Orientation preference */
  orientation: 'landscape' | 'portrait' | 'square';
  /** Minimum video width */
  minWidth: number;
}

export interface BRollClip {
  sectionIndex: number;
  filePath: string;
  duration: number;
  query: string;
  sourceUrl: string;
  attribution: string;
}

// ─── Layer 4: Avatar (HeyGen) ───────────────────────────────────

export interface AvatarConfig {
  enabled: boolean;
  provider: 'heygen';
  /** HeyGen avatar ID */
  avatarId: string;
  /** Rotate through these look IDs per section */
  lookIds: string[];
  /** Position of avatar overlay */
  position: 'bottom-right' | 'bottom-left' | 'bottom-center';
  /** Size as percentage of video width */
  scale: number;
  /** Use avatar voice instead of edge-tts */
  useAvatarVoice: boolean;
  /** HeyGen voice ID (if useAvatarVoice) */
  voiceId: string;
  /** Fraction of width to crop from center in portrait mode (default 0.70) */
  portraitCropX: number;
  /** Fraction of height to keep from top in portrait mode (default 0.85) */
  portraitCropY: number;
}

export interface AvatarClip {
  sectionIndex: number;
  filePath: string;
  duration: number;
}

// ─── Layer 5: Music & SFX ───────────────────────────────────────

export interface MusicConfig {
  enabled: boolean;
  provider: 'pixabay' | 'file';
  /** Mood keyword for search: calm, energetic, corporate, epic, dramatic */
  mood: string;
  /** Genre keyword: ambient, electronic, acoustic, cinematic, pop */
  genre: string;
  /** Volume relative to voice (0-1). Recommended: 0.15-0.25 */
  volume: number;
  /** Fade in duration in seconds */
  fadeInSec: number;
  /** Fade out duration in seconds */
  fadeOutSec: number;
  /** Local file path override (when provider is 'file') */
  filePath?: string;
}

export interface SFXConfig {
  enabled: boolean;
  /** Play transition sound between slides */
  transitionSound: boolean;
  /** Play intro sting at start */
  introSting: boolean;
  /** Play outro sting at end */
  outroSting: boolean;
  /** Volume relative to voice (0-1). Recommended: 0.3-0.5 */
  volume: number;
}

export interface MusicTrack {
  filePath: string;
  duration: number;
  title: string;
  attribution: string;
}

// ─── Layer 6: Captions ──────────────────────────────────────────

export interface CaptionConfig {
  enabled: boolean;
  /** Number of words per highlighted phrase (default 4) */
  wordsPerPhrase: number;
  /** Font size for caption text (default 52) */
  fontSize: number;
  /** Y position of caption band top edge (default 1500) */
  bandY: number;
  /** Height of caption band in pixels (default 150) */
  bandHeight: number;
  /** Background opacity behind caption text (0-1, default 0.5) */
  backgroundOpacity: number;
}

export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

// ─── Video Mode ─────────────────────────────────────────────────

export type VideoMode = 'standard' | 'short';

// ─── Aspect Ratio ────────────────────────────────────────────────

export type AspectRatio = '16:9' | '9:16';

// ─── Full Video Config ──────────────────────────────────────────

export interface VideoConfig {
  mode: VideoMode;
  style: StyleGuide;
  voice: VoiceProfile;
  images: ImageConfig;
  broll: BRollConfig;
  avatar: AvatarConfig;
  music: MusicConfig;
  sfx: SFXConfig;
  captions: CaptionConfig;
  aspectRatio: AspectRatio;
}

export interface BasicVideoConfig {
  style: StyleGuide;
  voice: VoiceProfile;
}

// ─── Cost Tracking ──────────────────────────────────────────────

export interface CostEstimate {
  research: number;
  script: number;
  metadata: number;
  images: number;
  broll: number;
  avatar: number;
  music: number;
  tts: number;
  captions: number;
  total: number;
  currency: 'USD';
}

/** Raw research output from Claude + web_search */
export interface ResearchResult {
  topic: string;
  summary: string;
  keyPoints: string[];
  detailedSections: ResearchSection[];
  estimates?: {
    time?: string;
    difficulty?: string;
    cost?: string;
  };
  sources: string[];
}

export interface ResearchSection {
  title: string;
  content: string;
  bulletPoints: string[];
  stats?: Record<string, string>;
}

/** Slide types supported by the rendering engine */
export type SlideType =
  | 'title'
  | 'stats'
  | 'list'
  | 'comparison'
  | 'process'
  | 'warning'
  | 'cta'
  | 'fact'
  | 'stat-hero';

/** A single section of the narrated script */
export interface ScriptSection {
  sectionIndex: number;
  slideType: SlideType;
  narrationText: string;
  slideData: SlideData;
  estimatedDuration: number; // seconds
}

/** Union of all slide data variants */
export type SlideData =
  | TitleSlideData
  | StatsSlideData
  | ListSlideData
  | ComparisonSlideData
  | ProcessSlideData
  | WarningSlideData
  | CtaSlideData
  | FactSlideData
  | StatHeroSlideData;

export interface TitleSlideData {
  type: 'title';
  title: string;
  subtitle: string;
}

export interface StatsSlideData {
  type: 'stats';
  title: string;
  stats: { value: string; label: string }[];
}

export interface ListSlideData {
  type: 'list';
  title: string;
  items: string[];
}

export interface ComparisonSlideData {
  type: 'comparison';
  title: string;
  leftColumn: { heading: string; items: string[] };
  rightColumn: { heading: string; items: string[] };
}

export interface ProcessSlideData {
  type: 'process';
  title: string;
  steps: string[];
}

export interface WarningSlideData {
  type: 'warning';
  title: string;
  message: string;
  callouts: string[];
}

export interface CtaSlideData {
  type: 'cta';
  title: string;
  subtitle: string;
  action: string;
}

export interface FactSlideData {
  type: 'fact';
  text: string;
}

export interface StatHeroSlideData {
  type: 'stat-hero';
  value: string;
  label: string;
  source?: string;
}

/** Full generated script */
export interface Script {
  topic: string;
  sections: ScriptSection[];
  totalEstimatedDuration: number;
}

/** Rendered slide image */
export interface SlideImage {
  sectionIndex: number;
  filePath: string;
  width: number;
  height: number;
}

/** Audio clip per section */
export interface AudioClip {
  sectionIndex: number;
  filePath: string;
  duration: number; // seconds
}

/** Audio generation result */
export interface AudioResult {
  clips: AudioClip[];
  combinedFilePath: string;
  totalDuration: number;
}

/** YouTube-ready metadata */
export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  timestamps: { time: string; label: string }[];
}

/** Final pipeline output */
export interface PipelineResult {
  jobId: string;
  topic: string;
  videoPath: string;
  thumbnailPath: string;
  metadata: VideoMetadata;
  cost: CostEstimate;
  timing: {
    research: number;
    script: number;
    slides: number;
    images: number;
    broll: number;
    avatar: number;
    audio: number;
    music: number;
    video: number;
    thumbnail: number;
    metadata: number;
    total: number;
    [key: string]: number;
  };
}

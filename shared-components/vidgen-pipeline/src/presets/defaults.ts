import {
  ImageConfig,
  BRollConfig,
  AvatarConfig,
  MusicConfig,
  SFXConfig,
  CaptionConfig,
  VideoConfig,
} from '../types';
import { DEFAULT_STYLE, SHORT_STYLE } from './styles';
import { PROFESSIONAL_VOICE, ENERGETIC_VOICE } from './voices';

export const DEFAULT_IMAGE_CONFIG: ImageConfig = {
  enabled: false,
  provider: 'openai',
  frequency: 2,          // every 2nd content slide
  stylePrompt: 'digital illustration, clean modern style, dark background',
  size: '1024x1024',     // cheapest option: $0.04/image
  quality: 'standard',
  placement: 'background',
  overlayOpacity: 0.3,
};

export const DEFAULT_BROLL_CONFIG: BRollConfig = {
  enabled: false,
  provider: 'pexels',
  frequency: 3,           // every 3rd content slide
  clipDuration: 5,
  orientation: 'landscape',
  minWidth: 1920,
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  enabled: false,
  provider: 'heygen',
  avatarId: '',
  lookIds: [],
  position: 'bottom-center',
  scale: 70,              // 70% of video width (fills bottom third in portrait)
  useAvatarVoice: false,
  voiceId: '',
  portraitCropX: 0.70,    // crop to center 70% width (removes green-screen side padding)
  portraitCropY: 0.85,    // keep top 85% height (removes empty space below)
};

export const DEFAULT_MUSIC_CONFIG: MusicConfig = {
  enabled: false,
  provider: 'pixabay',
  mood: 'calm',
  genre: 'ambient',
  volume: 0.35,
  fadeInSec: 3,
  fadeOutSec: 4,
};

export const DEFAULT_SFX_CONFIG: SFXConfig = {
  enabled: false,
  transitionSound: true,
  introSting: false,
  outroSting: false,
  volume: 0.4,
};

export const DEFAULT_CAPTION_CONFIG: CaptionConfig = {
  enabled: false,
  wordsPerPhrase: 4,
  fontSize: 52,
  bandY: 860,           // center of middle third (860–1060, centered at 960)
  bandHeight: 200,
  backgroundOpacity: 0.5,
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  mode: 'standard',
  style: DEFAULT_STYLE,
  voice: PROFESSIONAL_VOICE,
  images: DEFAULT_IMAGE_CONFIG,
  broll: DEFAULT_BROLL_CONFIG,
  avatar: DEFAULT_AVATAR_CONFIG,
  music: DEFAULT_MUSIC_CONFIG,
  sfx: DEFAULT_SFX_CONFIG,
  captions: DEFAULT_CAPTION_CONFIG,
  aspectRatio: '16:9',
};

export const SHORT_VIDEO_CONFIG: Partial<VideoConfig> = {
  mode: 'short',
  style: SHORT_STYLE,
  voice: ENERGETIC_VOICE,
  images: { ...DEFAULT_IMAGE_CONFIG, frequency: 1, placement: 'fullscreen', enabled: true },
  broll: { ...DEFAULT_BROLL_CONFIG, frequency: 2, clipDuration: 3, enabled: true },
  music: { ...DEFAULT_MUSIC_CONFIG, mood: 'energetic', volume: 0.3, enabled: true },
  sfx: { ...DEFAULT_SFX_CONFIG, transitionSound: true, introSting: true, outroSting: true, volume: 0.5, enabled: true },
  captions: { ...DEFAULT_CAPTION_CONFIG, enabled: true },
  aspectRatio: '9:16',
};

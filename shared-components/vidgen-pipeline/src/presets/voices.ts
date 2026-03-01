import { VoiceProfile } from '../types';

export const PROFESSIONAL_VOICE: VoiceProfile = {
  name: 'professional',
  personality: 'Authoritative and clear',
  archetype: 'News anchor',
  accent: 'American',
  speed: 'normal',
  tone: 'formal',
  edgeTtsVoice: 'en-US-GuyNeural',
  edgeTtsRate: '+0%',
};

export const FRIENDLY_VOICE: VoiceProfile = {
  name: 'friendly',
  personality: 'Warm and approachable',
  archetype: 'Teacher',
  accent: 'American',
  speed: 'normal',
  tone: 'conversational',
  edgeTtsVoice: 'en-US-JennyNeural',
  edgeTtsRate: '+0%',
};

export const ENERGETIC_VOICE: VoiceProfile = {
  name: 'energetic',
  personality: 'Upbeat and enthusiastic',
  archetype: 'YouTuber',
  accent: 'American',
  speed: 'fast',
  tone: 'enthusiastic',
  edgeTtsVoice: 'en-US-AndrewNeural',
  edgeTtsRate: '+10%',
};

export const CALM_VOICE: VoiceProfile = {
  name: 'calm',
  personality: 'Soothing and measured',
  archetype: 'Meditation guide',
  accent: 'American',
  speed: 'slow',
  tone: 'conversational',
  edgeTtsVoice: 'en-US-AriaNeural',
  edgeTtsRate: '-10%',
};

export const AUTHORITATIVE_VOICE: VoiceProfile = {
  name: 'authoritative',
  personality: 'Deep and commanding',
  archetype: 'Documentary narrator',
  accent: 'American',
  speed: 'normal',
  tone: 'formal',
  edgeTtsVoice: 'en-US-RogerNeural',
  edgeTtsRate: '-5%',
};

export const VOICE_PRESETS: Record<string, VoiceProfile> = {
  professional: PROFESSIONAL_VOICE,
  friendly: FRIENDLY_VOICE,
  energetic: ENERGETIC_VOICE,
  calm: CALM_VOICE,
  authoritative: AUTHORITATIVE_VOICE,
};

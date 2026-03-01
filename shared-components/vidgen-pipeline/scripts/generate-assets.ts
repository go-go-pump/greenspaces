/**
 * Generate bundled audio assets (music + SFX) using multi-layered FFmpeg compositions.
 * Run once: npx ts-node scripts/generate-assets.ts
 *
 * Creates:
 *   assets/music/{calm,corporate,energetic,epic,dramatic}.mp3
 *   assets/sfx/{transition,intro,outro}.mp3
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets');
const MUSIC_DIR = path.join(ASSETS_DIR, 'music');
const SFX_DIR = path.join(ASSETS_DIR, 'sfx');

fs.mkdirSync(MUSIC_DIR, { recursive: true });
fs.mkdirSync(SFX_DIR, { recursive: true });

function run(cmd: string, label: string): void {
  console.log(`  Generating ${label}...`);
  try {
    execSync(cmd, { encoding: 'utf-8', timeout: 60000, stdio: 'pipe' });
    console.log(`  ✓ ${label}`);
  } catch (err: any) {
    console.error(`  ✗ ${label}: ${err.stderr?.slice(0, 200) || err.message}`);
    throw err;
  }
}

// ─── Music Moods (30s loops) ───────────────────────────────────────────

interface MoodSpec {
  name: string;
  freqs: number[];     // chord tones (3-4 sine sources)
  tremRate: number;     // tremolo frequency
  tremDepth: number;    // tremolo depth (0-1)
  lowpass: number;      // lowpass cutoff Hz
  highpass: number;     // highpass cutoff Hz
  echoDelays: string;   // aecho delays param
  echoDecays: string;   // aecho decays param
  chorusDepth: number;  // chorus depth ms
  duration: number;     // seconds
}

const moods: MoodSpec[] = [
  {
    name: 'calm',
    freqs: [110, 131, 165, 220],
    tremRate: 0.5, tremDepth: 0.3,
    lowpass: 600, highpass: 60,
    echoDelays: '500|700', echoDecays: '0.4|0.3',
    chorusDepth: 3, duration: 30,
  },
  {
    name: 'corporate',
    freqs: [131, 165, 196, 262],
    tremRate: 1.0, tremDepth: 0.25,
    lowpass: 1200, highpass: 80,
    echoDelays: '300|500', echoDecays: '0.3|0.2',
    chorusDepth: 2, duration: 30,
  },
  {
    name: 'energetic',
    freqs: [165, 208, 247, 330],
    tremRate: 3.0, tremDepth: 0.4,
    lowpass: 2500, highpass: 100,
    echoDelays: '150|250', echoDecays: '0.25|0.15',
    chorusDepth: 4, duration: 30,
  },
  {
    name: 'epic',
    freqs: [73, 87, 110, 147],
    tremRate: 0.8, tremDepth: 0.35,
    lowpass: 900, highpass: 40,
    echoDelays: '600|900|1200', echoDecays: '0.45|0.35|0.25',
    chorusDepth: 5, duration: 30,
  },
  {
    name: 'dramatic',
    freqs: [117, 139, 175, 233],
    tremRate: 2.0, tremDepth: 0.45,
    lowpass: 1500, highpass: 70,
    echoDelays: '400|600', echoDecays: '0.35|0.25',
    chorusDepth: 4, duration: 30,
  },
];

console.log('\n=== Generating Music Assets ===\n');

for (const mood of moods) {
  const outputPath = path.join(MUSIC_DIR, `${mood.name}.mp3`);

  // Build FFmpeg inputs: one lavfi sine source per frequency
  const inputs = mood.freqs
    .map((f) => `-f lavfi -i "sine=frequency=${f}:duration=${mood.duration}"`)
    .join(' ');

  // Mix all inputs, apply tremolo for rhythm, chorus for width, echo for space,
  // bandpass for shaping, and dynaudnorm for leveling
  const inputLabels = mood.freqs.map((_, i) => `[${i}:a]`).join('');
  const filterChain = [
    `${inputLabels}amix=inputs=${mood.freqs.length}:duration=longest`,
    `tremolo=f=${mood.tremRate}:d=${mood.tremDepth}`,
    `chorus=0.5:0.9:50|60:${mood.chorusDepth}|${mood.chorusDepth + 1}:0.4|0.3:2|2.3`,
    `aecho=0.8:0.7:${mood.echoDelays}:${mood.echoDecays}`,
    `lowpass=f=${mood.lowpass}`,
    `highpass=f=${mood.highpass}`,
    `afade=t=in:st=0:d=2`,
    `afade=t=out:st=${mood.duration - 3}:d=3`,
    `dynaudnorm=p=0.9:s=5`,
    `volume=1.0`,
  ].join(',');

  const cmd = `ffmpeg -y ${inputs} -filter_complex "${filterChain}[out]" -map "[out]" -c:a libmp3lame -q:a 4 "${outputPath}"`;
  run(cmd, `music/${mood.name}.mp3`);
}

// ─── SFX Assets ────────────────────────────────────────────────────────

console.log('\n=== Generating SFX Assets ===\n');

// Transition: sine sweep (2000→low) + pink noise burst + bandpass + echo
{
  const outputPath = path.join(SFX_DIR, 'transition.mp3');
  // Pre-compute asetrate: 44100 * 0.3 = 13230 (for downward sweep)
  const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=2000:duration=0.5,asetrate=13230,aresample=44100" -f lavfi -i "anoisesrc=d=0.5:c=pink:a=0.3" -filter_complex "[0:a][1:a]amix=inputs=2:duration=shortest,bandpass=f=800:w=600,aecho=0.8:0.5:100:0.3,afade=t=in:st=0:d=0.05,afade=t=out:st=0.2:d=0.3,dynaudnorm=p=0.9[out]" -map "[out]" -c:a libmp3lame -q:a 4 "${outputPath}"`;
  run(cmd, 'sfx/transition.mp3');
}

// Intro: 3-note ascending arpeggio + flanger shimmer + echo
{
  const outputPath = path.join(SFX_DIR, 'intro.mp3');
  // Three sine tones at ascending frequencies, staggered with adelay
  const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=440:duration=0.3" -f lavfi -i "sine=frequency=554:duration=0.3" -f lavfi -i "sine=frequency=659:duration=0.3" -filter_complex "[0:a]afade=t=in:st=0:d=0.05,afade=t=out:st=0.15:d=0.15[a0];[1:a]adelay=200|200,afade=t=in:st=0:d=0.05,afade=t=out:st=0.15:d=0.15[a1];[2:a]adelay=400|400,afade=t=in:st=0:d=0.05,afade=t=out:st=0.15:d=0.15[a2];[a0][a1][a2]amix=inputs=3:duration=longest,flanger=delay=3:depth=3:speed=0.5,aecho=0.8:0.6:200|300:0.3|0.2,dynaudnorm=p=0.9,apad=whole_dur=1.0[out]" -map "[out]" -c:a libmp3lame -q:a 4 "${outputPath}"`;
  run(cmd, 'sfx/intro.mp3');
}

// Outro: descending chord + long echo tail + gentle fade
{
  const outputPath = path.join(SFX_DIR, 'outro.mp3');
  const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=523:duration=0.5" -f lavfi -i "sine=frequency=440:duration=0.5" -f lavfi -i "sine=frequency=349:duration=0.5" -filter_complex "[0:a]afade=t=out:st=0.2:d=0.3[a0];[1:a]adelay=150|150,afade=t=out:st=0.2:d=0.3[a1];[2:a]adelay=300|300,afade=t=out:st=0.2:d=0.3[a2];[a0][a1][a2]amix=inputs=3:duration=longest,aecho=0.8:0.7:400|600|800:0.4|0.3|0.2,lowpass=f=1200,afade=t=out:st=0.5:d=1.0,dynaudnorm=p=0.9,apad=whole_dur=1.5[out]" -map "[out]" -c:a libmp3lame -q:a 4 "${outputPath}"`;
  run(cmd, 'sfx/outro.mp3');
}

console.log('\n=== All assets generated! ===');
console.log(`Music: ${fs.readdirSync(MUSIC_DIR).join(', ')}`);
console.log(`SFX:   ${fs.readdirSync(SFX_DIR).join(', ')}`);

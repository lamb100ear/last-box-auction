import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sampleRate = 22050;
const outputDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "声音"
);

const noteOffsets = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11
};

function note(name) {
  const match = String(name).match(/^([A-G]#?)(-?\d)$/);
  if (!match) throw new Error(`Invalid note: ${name}`);
  const [, pitch, octave] = match;
  return 12 * (Number(octave) + 1) + noteOffsets[pitch];
}

function frequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function chord(root, intervals) {
  const rootMidi = note(root);
  return intervals.map((interval) => frequency(rootMidi + interval));
}

function makeRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function addTone(
  buffer,
  startSeconds,
  durationSeconds,
  toneFrequency,
  amplitude,
  options = {}
) {
  const start = Math.max(0, Math.floor(startSeconds * sampleRate));
  const length = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const attack = Math.max(
    0.005,
    Number(options.attack ?? Math.min(0.08, durationSeconds * 0.2)) * sampleRate
  );
  const release = Math.max(
    0.01,
    Number(options.release ?? Math.min(0.35, durationSeconds * 0.45)) *
      sampleRate
  );
  const tremolo = Number(options.tremolo ?? 0);
  const detune = Number(options.detune ?? 1);
  const phase = Number(options.phase ?? 0);
  const harmonics = options.harmonics ?? [1, 0.32, 0.12];

  for (let offset = 0; offset < length && start + offset < buffer.length; offset += 1) {
    const time = offset / sampleRate;
    const envelope =
      Math.min(1, offset / attack) *
      Math.min(1, (length - offset) / release) *
      Math.exp(-time * Number(options.decay ?? 0.6));
    const wobble =
      tremolo > 0
        ? 1 + Math.sin(2 * Math.PI * tremolo * time + phase) * 0.035
        : 1;
    let sample = 0;
    harmonics.forEach((weight, index) => {
      if (!weight) return;
      const harmonicFrequency = toneFrequency * (index + 1) * detune;
      sample +=
        Math.sin(
          2 * Math.PI * harmonicFrequency * time +
            phase * (index + 1)
        ) * weight;
    });
    buffer[start + offset] += sample * envelope * amplitude * wobble;
  }
}

function addKick(buffer, startSeconds, amplitude) {
  const start = Math.floor(startSeconds * sampleRate);
  const length = Math.floor(0.18 * sampleRate);
  for (let offset = 0; offset < length && start + offset < buffer.length; offset += 1) {
    const time = offset / sampleRate;
    const envelope = Math.exp(-time * 24);
    const toneFrequency = 62 - time * 90;
    buffer[start + offset] +=
      Math.sin(2 * Math.PI * toneFrequency * time) *
      envelope *
      amplitude;
  }
}

function addBrush(buffer, startSeconds, amplitude, random) {
  const start = Math.floor(startSeconds * sampleRate);
  const length = Math.floor(0.075 * sampleRate);
  for (let offset = 0; offset < length && start + offset < buffer.length; offset += 1) {
    const time = offset / sampleRate;
    const envelope = Math.exp(-time * 35);
    const noise = random() * 2 - 1;
    buffer[start + offset] += noise * envelope * amplitude;
  }
}

function applyEcho(buffer, delaySeconds, feedback, mix) {
  const delay = Math.floor(delaySeconds * sampleRate);
  for (let index = delay; index < buffer.length; index += 1) {
    buffer[index] += buffer[index - delay] * feedback * mix;
  }
}

function normalize(buffer, target = 0.82) {
  let peak = 0;
  for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
  if (!peak) return;
  const gain = target / peak;
  for (let index = 0; index < buffer.length; index += 1) {
    buffer[index] *= gain;
  }
}

function writeWave(filePath, samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clipped * 32767), 44 + index * 2);
  });
  fs.writeFileSync(filePath, buffer);
}

const tracks = [
  {
    fileName: "menu_noir_loop.wav",
    seed: 4117,
    bpm: 80,
    bars: 12,
    chords: [
      chord("A2", [0, 3, 7, 10, 14]),
      chord("F2", [0, 4, 7, 11, 14]),
      chord("C3", [0, 4, 7, 11, 14]),
      chord("E2", [0, 4, 7, 10, 13])
    ],
    bass: [45, 41, 48, 40],
    melody: [
      [0, 64, 1.2, 0.09],
      [1.5, 67, 0.7, 0.07],
      [2.5, 69, 1.1, 0.08],
      [3.5, 67, 0.55, 0.06]
    ],
    melodyMask: [true, true, false, true],
    padGain: 0.055,
    bassGain: 0.14,
    melodyGain: 0.13,
    kickGain: 0.07,
    brushGain: 0.025,
    crackleGain: 0.008
  },
  {
    fileName: "day_market_loop.wav",
    seed: 9251,
    bpm: 96,
    bars: 16,
    chords: [
      chord("C3", [0, 4, 7, 11, 14]),
      chord("A2", [0, 3, 7, 10, 14]),
      chord("D3", [0, 3, 7, 10, 14]),
      chord("G2", [0, 4, 7, 10, 14])
    ],
    bass: [48, 45, 50, 43],
    melody: [
      [0, 67, 0.8, 0.08],
      [0.75, 69, 0.5, 0.06],
      [1.5, 71, 0.7, 0.075],
      [2.5, 69, 0.8, 0.07],
      [3.25, 64, 0.5, 0.055]
    ],
    melodyMask: [true, true, true, false],
    padGain: 0.045,
    bassGain: 0.15,
    melodyGain: 0.115,
    kickGain: 0.055,
    brushGain: 0.032,
    crackleGain: 0.006
  },
  {
    fileName: "case_file_loop.wav",
    seed: 13773,
    bpm: 72,
    bars: 12,
    chords: [
      chord("D2", [0, 3, 7, 10, 14]),
      chord("A#1", [0, 4, 7, 11, 14]),
      chord("G2", [0, 3, 7, 10, 14]),
      chord("A2", [0, 4, 7, 10, 13])
    ],
    bass: [38, 34, 43, 45],
    melody: [
      [0, 62, 1.4, 0.075],
      [1.75, 65, 0.8, 0.06],
      [2.75, 63, 1.5, 0.07],
      [4.75, 60, 0.7, 0.05]
    ],
    melodyMask: [true, false, true, true],
    padGain: 0.065,
    bassGain: 0.16,
    melodyGain: 0.105,
    kickGain: 0.045,
    brushGain: 0.018,
    crackleGain: 0.012
  }
];

fs.mkdirSync(outputDirectory, { recursive: true });

for (const track of tracks) {
  const random = makeRandom(track.seed);
  const beatDuration = 60 / track.bpm;
  const barDuration = beatDuration * 4;
  const duration = barDuration * track.bars;
  const samples = new Float32Array(Math.floor(duration * sampleRate));

  for (const [sampleIndex] of samples.entries()) {
    const crackle = random() < 0.0015 ? random() * 2 - 1 : 0;
    samples[sampleIndex] = crackle * track.crackleGain;
  }

  for (let bar = 0; bar < track.bars; bar += 1) {
    const barStart = bar * barDuration;
    const chordFrequencies = track.chords[bar % track.chords.length];
    const rootFrequency = frequency(track.bass[bar % track.bass.length]);

    chordFrequencies.forEach((toneFrequency, toneIndex) => {
      addTone(
        samples,
        barStart,
        barDuration * 1.02,
        toneFrequency,
        track.padGain / Math.sqrt(toneIndex + 1),
        {
          attack: 0.8,
          release: 0.8,
          decay: 0.08,
          tremolo: 0.16 + toneIndex * 0.015,
          detune: 0.998 + toneIndex * 0.0015,
          phase: bar * 0.37 + toneIndex,
          harmonics: [1, 0.22, 0.08]
        }
      );
    });

    [0, 1.5, 2.5, 3.5].forEach((beat, index) => {
      if (index === 3 && bar % 4 === 3) return;
      addTone(
        samples,
        barStart + beat * beatDuration,
        Math.min(1.15, beatDuration * 1.35),
        rootFrequency,
        track.bassGain,
        {
          attack: 0.015,
          release: 0.28,
          decay: 3.1,
          harmonics: [1, 0.42, 0.12]
        }
      );
    });

    if (track.melodyMask[bar % track.melodyMask.length]) {
      track.melody.forEach(([beat, midi, beats, gain], index) => {
        addTone(
          samples,
          barStart + beat * beatDuration,
          beats * beatDuration,
          frequency(midi),
          track.melodyGain * gain,
          {
            attack: 0.025,
            release: 0.35,
            decay: 2.3,
            tremolo: 4.2,
            phase: index * 0.8,
            harmonics: [1, 0.3, 0.09]
          }
        );
      });
    }

    addKick(samples, barStart, track.kickGain);
    addKick(samples, barStart + 2 * beatDuration, track.kickGain * 0.65);
    for (let beat = 0.5; beat < 4; beat += 1) {
      addBrush(
        samples,
        barStart + beat * beatDuration,
        track.brushGain * (beat % 1 ? 1 : 0.75),
        random
      );
    }
  }

  applyEcho(samples, beatDuration * 0.75, 0.32, 0.75);
  applyEcho(samples, beatDuration * 1.5, 0.18, 0.7);
  normalize(samples);

  const fadeSamples = Math.floor(sampleRate * 0.04);
  for (let index = 0; index < fadeSamples; index += 1) {
    const gain = index / fadeSamples;
    samples[index] *= gain;
    samples[samples.length - 1 - index] *= gain;
  }

  const outputPath = path.join(outputDirectory, track.fileName);
  writeWave(outputPath, samples);
  console.log(`${track.fileName}: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

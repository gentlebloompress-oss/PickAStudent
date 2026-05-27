import type { SoundChoice } from '../types';

/**
 * Sounds are synthesized via the Web Audio API rather than shipped as binary
 * files. That means zero extra assets to cache for the PWA, perfect offline
 * behavior, and no licensing worries.
 *
 * To add a new sound type: implement a function that takes (ctx, when) and
 * schedules its oscillators/buffers, then add the case to `play()`.
 */

let ctx: AudioContext | null = null;
function audio(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function play(choice: SoundChoice, enabled: boolean) {
  if (!enabled || choice === 'silent') return;
  try {
    const c = audio();
    const t = c.currentTime;
    if (choice === 'ding') ding(c, t);
    else if (choice === 'chime') chime(c, t);
    else if (choice === 'drumroll') drumroll(c, t);
  } catch {
    /* audio not available — silently ignore */
  }
}

/**
 * Wheel-of-fortune ratchet — a sequence of woody clicks scheduled at
 * angularly-uniform intervals so the click rate naturally tracks the wheel's
 * deceleration (fast at the start of the spin, slowing as it eases out).
 *
 * Not exposed as a user-selectable sound. Wheel mode always plays this; the
 * settings.sound choice (ding / chime / drumroll) is for Standard and Mystery.
 */
export function playWheelSpin(durationMs: number, enabled: boolean) {
  if (!enabled) return;
  try {
    const c = audio();
    wheelRatchet(c, c.currentTime, durationMs);
  } catch { /* audio not available — silently ignore */ }
}

function wheelRatchet(c: AudioContext, startTime: number, durationMs: number) {
  const totalClicks = 38;
  const durSec = durationMs / 1000;
  for (let i = 0; i < totalClicks; i++) {
    // Wheel angle follows ease-out-quint: 1 - (1-p)^5.
    // To schedule clicks at uniform angular intervals (so the audible click
    // rate matches the visible rotation rate) we invert that curve:
    //   inverseEased(x) = 1 - (1 - x)^(1/5)
    const angularProgress = (i + 1) / totalClicks;
    const timeProgress = 1 - Math.pow(1 - angularProgress, 1 / 5);
    const when = startTime + timeProgress * durSec;
    // Slight taper so the trailing clicks feel softer.
    const fade = 1 - (i / totalClicks) * 0.4;
    scheduleClick(c, when, 0.12 * fade);
  }
}

function scheduleClick(c: AudioContext, when: number, gain: number) {
  // Short bandpassed noise burst — woody, mechanical.
  const noiseDur = 0.028;
  const len = Math.max(1, Math.floor(c.sampleRate * noiseDur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = (1 - i / len) ** 2;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  filter.Q.value = 4;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(when);
}

function ding(c: AudioContext, t: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(660, t + 0.18);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.55);
}

function chime(c: AudioContext, t: number, peak = 0.22) {
  const freqs = [523.25, 659.25, 783.99]; // C5 E5 G5
  freqs.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const start = t + i * 0.06;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
    o.connect(g).connect(c.destination);
    o.start(start);
    o.stop(start + 1);
  });
}

function drumroll(c: AudioContext, t: number) {
  // Short noise burst with a low-pass sweep to suggest a roll, ending on a snare hit.
  const dur = 0.7;
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.min(1, i / (data.length * 0.3)) * (1 - i / data.length);
    data[i] = (Math.random() * 2 - 1) * env * 0.7;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(700, t);
  filter.frequency.exponentialRampToValueAtTime(4000, t + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);

  // Final accent
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(220, t + dur);
  g.gain.setValueAtTime(0.0001, t + dur);
  g.gain.exponentialRampToValueAtTime(0.3, t + dur + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.18);
  o.connect(g).connect(c.destination);
  o.start(t + dur);
  o.stop(t + dur + 0.2);
}

// world-class-charts: sonification. Plays a series as pitch over time, like Highcharts sonification
// and Apple Audio Graphs: low values low, high values high, about 2 seconds in total. No sound plays
// unless the user asks (press S on a focused chart). Esc or blur stops it.
type Ctx = AudioContext;
let ctx: Ctx | null = null;
let stopAt: (() => void) | null = null;

export function stopSound() { stopAt?.(); stopAt = null; }

/** Play values as tones from 220 Hz (lowest) to 880 Hz (highest). Returns the tone pitches. */
export function playSeries(values: number[], totalMs = 2000): number[] {
  const finite = values.filter(Number.isFinite);
  if (!finite.length || typeof window === "undefined") return [];
  const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!AC) return [];
  stopSound();
  ctx ??= new AC();
  const lo = Math.min(...finite), hi = Math.max(...finite);
  // Keep it under about 2 s: long series are thinned to at most 60 notes.
  const step = Math.max(1, Math.ceil(values.length / 60));
  const notes = values.filter((_, i) => i % step === 0);
  const dur = Math.min(0.25, totalMs / 1000 / notes.length);
  const t0 = ctx.currentTime + 0.05;
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  const pitches = notes.map((v) => (Number.isFinite(v) ? 220 * 2 ** (2 * (hi === lo ? 0.5 : (v - lo) / (hi - lo))) : 0));
  pitches.forEach((f, i) => {
    // A gap (missing value) is silence, not a made-up tone.
    osc.frequency.setValueAtTime(f || 220, t0 + i * dur);
    gain.gain.setValueAtTime(f ? 0.12 : 0, t0 + i * dur);
  });
  osc.connect(gain);
  osc.start(t0);
  osc.stop(t0 + notes.length * dur);
  stopAt = () => { try { osc.stop(); } catch { /* already stopped */ } };
  return pitches;
}

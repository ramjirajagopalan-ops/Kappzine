/**
 * Synthesizes a short paper-flip "whoosh" using the Web Audio API instead of
 * shipping a licensed sound asset — a burst of filtered noise with a fast
 * exponential decay reads as a page turn without needing any external file.
 */
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  return ctx;
}

export function playFlipSound(volume = 0.35): void {
  const audioCtx = getContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") void audioCtx.resume();

  const duration = 0.28;
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.2);
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2200;
  bandpass.Q.value = 0.6;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  noise.connect(bandpass).connect(gain).connect(audioCtx.destination);
  noise.start();
  noise.stop(audioCtx.currentTime + duration);
}

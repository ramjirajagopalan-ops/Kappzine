let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) ctx = new AudioCtor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

/**
 * Synthesizes a short paper-like "whoosh" burst entirely with the Web Audio
 * API (filtered white noise + a quick envelope) instead of shipping an
 * audio file, so the page-turn sound needs no external asset or license.
 */
export function playPageTurnSound(volume = 0.35) {
  const audioCtx = getContext();
  if (!audioCtx) return;

  const duration = 0.32;
  const bufferSize = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1800, audioCtx.currentTime);
  bandpass.frequency.exponentialRampToValueAtTime(650, audioCtx.currentTime + duration);
  bandpass.Q.value = 0.7;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start();
  noise.stop(audioCtx.currentTime + duration);
}

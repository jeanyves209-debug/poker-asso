import { Platform } from 'react-native';

let audioContext: AudioContext | null = null;
let unlocked = false;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  return audioContext;
}

/** Call once after a user gesture so browsers allow later beeps. */
export async function unlockTimerSound(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
  unlocked = true;
}

export function playOneMinuteWarning(): void {
  const ctx = getAudioContext();
  if (!ctx || !unlocked) {
    return;
  }

  const now = ctx.currentTime;

  const playTone = (start: number, frequency: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  // Two short beeps — classic tournament clock warning.
  playTone(now, 880, 0.18);
  playTone(now + 0.28, 880, 0.22);
}

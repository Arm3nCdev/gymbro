// Web Audio API beep synthesizer for workout rest intervals
// Pre-warm SpeechSynthesis voices immediately when module loads
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch (e) {
        // ignore
      }
    };
  } catch (e) {
    // ignore
  }
}

export function playTimerBeep(type: 'countdown' | 'finish' = 'finish') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'countdown') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Finish fanfare double beep
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174, now + 0.28);
      gain2.gain.setValueAtTime(0.2, now + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.28);
      osc2.stop(now + 0.6);
    }
  } catch (err) {
    console.debug('Audio play skipped:', err);
  }
}

// Energetic coach cue chime
export function playMotivationalChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.debug('Chime skipped', e);
  }
}

// Global active utterance reference to prevent browser garbage collection cutting off speech
let globalActiveUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // Ignore
    }
  }
  globalActiveUtterance = null;
}

export function speakTextAloud(text: string, onStart?: () => void, onEnd?: () => void) {
  // Always play immediate audio chime so user gets instant audible feedback
  playMotivationalChime();

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onStart) onStart();
    setTimeout(() => { if (onEnd) onEnd(); }, 1200);
    return;
  }

  try {
    // 1. Cancel previous speech
    window.speechSynthesis.cancel();

    // 2. Resume in case the browser SpeechSynthesis engine is in paused state
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Clean emojis & symbols that cause synth to stumble
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[💪🔥💧🦍⚡🏋️‍♂️⏳💥🚀🎯🦁🥛🥩🥊]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    globalActiveUtterance = utterance; // Keep active in memory!
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick a Spanish voice if loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const spanishVoice =
        voices.find((v) => v.lang.startsWith('es-AR')) ||
        voices.find((v) => v.lang.startsWith('es-ES')) ||
        voices.find((v) => v.lang.startsWith('es-MX')) ||
        voices.find((v) => v.lang.startsWith('es') || v.name.toLowerCase().includes('spanish'));

      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      globalActiveUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      globalActiveUtterance = null;
      if (onEnd) onEnd();
    };

    // Small delay to prevent Chromium cancel() race condition
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('speak failed', err);
        if (onEnd) onEnd();
      }
    }, 50);
  } catch (err) {
    console.warn('Speech error', err);
    if (onEnd) onEnd();
  }
}


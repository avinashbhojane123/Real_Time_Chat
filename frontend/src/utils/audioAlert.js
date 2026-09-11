/**
 * Synthesizes a melodic movie invitation chime using the Web Audio API.
 * Avoids any external audio file dependencies or missing asset 404s.
 */
export function playMovieInviteChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic chords: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.5Hz)
    const notes = [
      { freq: 523.25, time: 0, dur: 0.5, gain: 0.15 },
      { freq: 659.25, time: 0.1, dur: 0.6, gain: 0.18 },
      { freq: 783.99, time: 0.2, dur: 0.8, gain: 0.22 },
      { freq: 1046.5, time: 0.32, dur: 1.1, gain: 0.25 },
    ];

    notes.forEach(({ freq, time, dur, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gainNode.gain.setValueAtTime(gain, now + time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch (err) {
    // Autoplay or AudioContext restriction fallback
    console.debug('[AudioAlert] Web Audio playback skipped:', err);
  }
}

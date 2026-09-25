/**
 * Synthesizes melodic chimes, ringtones, and call feedback using the Web Audio API.
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

    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch (_) {}
    }, 1600);
  } catch (err) {
    console.debug('[AudioAlert] Web Audio playback skipped:', err);
  }
}

/**
 * Starts a repeating incoming call ringtone using the Web Audio API.
 * Returns a cleanup function that stops the ringtone immediately.
 */
export function startIncomingRingtone() {
  let isStopped = false;
  let timer = null;
  let activeCtx = null;

  const playChimeCycle = () => {
    if (isStopped) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      activeCtx = ctx;
      const now = ctx.currentTime;

      // Modern pleasant Marimba/WhatsApp style melody
      // E5 (659Hz), G#5 (830Hz), B5 (987Hz), E6 (1318Hz)
      const ringNotes = [
        { freq: 659.25, time: 0.0, dur: 0.25, gain: 0.2 },
        { freq: 830.61, time: 0.18, dur: 0.25, gain: 0.22 },
        { freq: 987.77, time: 0.36, dur: 0.3, gain: 0.24 },
        { freq: 1318.51, time: 0.54, dur: 0.45, gain: 0.26 },
        { freq: 987.77, time: 0.9, dur: 0.25, gain: 0.2 },
        { freq: 1318.51, time: 1.08, dur: 0.5, gain: 0.25 },
      ];

      ringNotes.forEach(({ freq, time, dur, gain }) => {
        if (isStopped) return;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gainNode.gain.setValueAtTime(gain, now + time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });

      setTimeout(() => {
        if (ctx && ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      }, 1800);
    } catch (e) {
      console.debug('[AudioAlert] Incoming ringtone error:', e);
    }
  };

  playChimeCycle();
  timer = setInterval(playChimeCycle, 2400);

  return () => {
    isStopped = true;
    if (timer) clearInterval(timer);
    if (activeCtx && activeCtx.state !== 'closed') {
      try {
        activeCtx.close().catch(() => {});
      } catch (_) {}
    }
  };
}

/**
 * Starts a repeating outgoing dial/ringback tone.
 * Returns a cleanup function that stops playback immediately.
 */
export function startOutgoingDialTone() {
  let isStopped = false;
  let timer = null;
  let activeCtx = null;

  const playToneBurst = () => {
    if (isStopped) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      activeCtx = ctx;
      const now = ctx.currentTime;

      // Soft dual-frequency phone ringback (440Hz + 480Hz)
      const freqs = [440, 480];
      const burstDuration = 1.2;

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.setValueAtTime(0.08, now + burstDuration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0.0001, now + burstDuration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + burstDuration);
      });

      setTimeout(() => {
        if (ctx && ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      }, (burstDuration + 0.1) * 1000);
    } catch (e) {
      console.debug('[AudioAlert] Outgoing dial tone error:', e);
    }
  };

  playToneBurst();
  timer = setInterval(playToneBurst, 3200);

  return () => {
    isStopped = true;
    if (timer) clearInterval(timer);
    if (activeCtx && activeCtx.state !== 'closed') {
      try {
        activeCtx.close().catch(() => {});
      } catch (_) {}
    }
  };
}

/**
 * Plays a short descending 3-note chime when a call ends.
 */
export function playCallEndedTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const notes = [
      { freq: 480, time: 0, dur: 0.15, gain: 0.15 },
      { freq: 380, time: 0.16, dur: 0.15, gain: 0.15 },
      { freq: 280, time: 0.32, dur: 0.3, gain: 0.18 },
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

    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch (_) {}
    }, 800);
  } catch (_) {}
}

/**
 * Plays a double beep indicating call was declined or busy.
 */
export function playCallDeclinedTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, now + offset);

      gainNode.gain.setValueAtTime(0.12, now + offset);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });

    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch (_) {}
    }, 600);
  } catch (_) {}
}

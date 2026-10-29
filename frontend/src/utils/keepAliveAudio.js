/**
 * Background Audio Keep-Alive Engine
 * 
 * Mobile operating systems (especially iOS Safari and Android Chrome) forcefully freeze
 * background JavaScript execution and terminate WebSockets after 15–30 seconds of
 * the screen locking or switching tabs.
 * 
 * To prevent battery drain and avoid interrupting external music/podcasts (Spotify, Apple Music):
 * 1. An AudioContext is prepared upon user gesture but kept SUSPENDED while the page is in the foreground.
 * 2. It is only resumed when the page transitions to the background (`document.visibilityState === 'hidden'`).
 * 3. A completely silent AudioBuffer (all zero samples) is used instead of a continuous oscillator tone.
 * 4. As soon as the user returns to the app (`document.visibilityState === 'visible'`), the context
 *    is suspended immediately to yield audio focus back to the OS and eliminate CPU/battery consumption.
 */

let audioCtx = null;
let bufferSourceNode = null;
let isKeepAliveEnabled = false;
let visibilityListenerInstalled = false;

function createSilentBufferSource(ctx) {
  // Create a 1-second silent buffer (all samples 0.0)
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(ctx.destination);
  return source;
}

function handleVisibilityChange() {
  if (!isKeepAliveEnabled || !audioCtx) return;

  if (document.visibilityState === 'hidden') {
    // Tab backgrounded: resume audio context to keep websocket thread active
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } else {
    // Tab foregrounded: suspend audio context immediately to save battery & free audio focus
    if (audioCtx.state === 'running') {
      audioCtx.suspend().catch(() => {});
    }
  }
}

export function startBackgroundAudioKeepAlive() {
  if (isKeepAliveEnabled) return;
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (!bufferSourceNode) {
      bufferSourceNode = createSilentBufferSource(audioCtx);
      bufferSourceNode.start();
    }

    // Keep suspended while foregrounded; will resume on backgrounding
    if (document.visibilityState === 'visible') {
      audioCtx.suspend().catch(() => {});
    }

    if (!visibilityListenerInstalled && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityListenerInstalled = true;
    }

    isKeepAliveEnabled = true;
  } catch (err) {
    console.debug('[KeepAlive] Audio keep-alive initialization skipped:', err);
  }
}

export function stopBackgroundAudioKeepAlive() {
  if (!isKeepAliveEnabled) return;

  try {
    if (visibilityListenerInstalled && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      visibilityListenerInstalled = false;
    }

    if (bufferSourceNode) {
      try {
        bufferSourceNode.stop();
        bufferSourceNode.disconnect();
      } catch (_) {}
      bufferSourceNode = null;
    }

    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  } catch (_) {}

  isKeepAliveEnabled = false;
}

export function isAudioKeepAliveActive() {
  return isKeepAliveEnabled;
}

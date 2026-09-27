/**
 * Background Audio Keep-Alive Engine
 * 
 * Mobile operating systems (especially iOS Safari and Android Chrome) forcefully freeze
 * background JavaScript execution and terminate WebSockets after 15–30 seconds of
 * the screen locking or switching tabs.
 * 
 * By maintaining an inaudible, silent audio output stream using the Web Audio API,
 * the mobile OS treats the web application as an active media session (like a music player),
 * preventing the background execution thread from being suspended and keeping the
 * WebSocket connection alive.
 */

let audioCtx = null;
let oscillatorNode = null;
let gainNode = null;
let isKeepAliveRunning = false;

export function startBackgroundAudioKeepAlive() {
  if (isKeepAliveRunning) return;
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();

    // Create an inaudible sub-threshold audio carrier (frequency 440Hz with near-zero amplitude)
    oscillatorNode = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    // Amplitude is set to 0.00001 (completely silent to the human ear)
    gainNode.gain.setValueAtTime(0.00001, audioCtx.currentTime);

    oscillatorNode.type = 'sine';
    oscillatorNode.frequency.setValueAtTime(440, audioCtx.currentTime);

    oscillatorNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillatorNode.start();
    isKeepAliveRunning = true;
    console.log('[KeepAlive] Background audio keep-alive activated (WebSockets protected)');

    // Resume AudioContext if suspended by browser autoplay policy
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (err) {
    console.debug('[KeepAlive] Audio keep-alive initialization skipped:', err);
  }
}

export function stopBackgroundAudioKeepAlive() {
  if (!isKeepAliveRunning) return;

  try {
    if (oscillatorNode) {
      oscillatorNode.stop();
      oscillatorNode.disconnect();
      oscillatorNode = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  } catch (_) {}

  isKeepAliveRunning = false;
  console.log('[KeepAlive] Background audio keep-alive deactivated');
}

export function isAudioKeepAliveActive() {
  return isKeepAliveRunning;
}

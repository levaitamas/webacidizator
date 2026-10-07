// ============================================================================
// Utility Functions
// ============================================================================

import { CONFIG } from "./config.js";
import { DOM } from "./dom.js";

export const showError = (message) => {
  DOM.container.innerHTML = `
    <div class="error">
      <strong>Camera Access Needed</strong>
      <span>${message}</span>
    </div>
  `;
};

export const randomInRange = (min, max) => min + Math.random() * (max - min);

let statusTimer = null;

export const setStatus = (message, duration = 0) => {
  // Cancel the previous message's auto-clear so it can't wipe this one.
  clearTimeout(statusTimer);
  statusTimer = null;
  DOM.status.textContent = message;
  if (duration > 0) {
    statusTimer = setTimeout(() => { DOM.status.textContent = ''; }, duration);
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const nextAnimationFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

// Collapses bursts of calls (e.g. continuous window "resize" events)
// into at most one invocation per animation frame.
export const rafThrottle = (fn) => {
  let scheduled = false;
  return (...args) => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn(...args);
    });
  };
};

// Waits for an actual decoded video frame to be available, so the next
// texture upload doesn't grab a stale/black frame right after a stream
// swap. Falls back to a fixed delay on browsers without
// requestVideoFrameCallback (e.g. Firefox).
export const waitForVideoFrame = (video) => {
  if (typeof video.requestVideoFrameCallback === 'function') {
    return new Promise((resolve) => video.requestVideoFrameCallback(resolve));
  }
  return delay(CONFIG.DELAYS.STREAM_STABILITY_FALLBACK);
};

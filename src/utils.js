// ============================================================================
// Utility Functions
// ============================================================================

import { CONFIG } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";

// ----------------------------------------------------------------------------
// Viewfinder state overlay (startup / error)
// ----------------------------------------------------------------------------

let retryHandler = null;

DOM.retryBtn.addEventListener('click', () => {
  const handler = retryHandler;
  retryHandler = null;
  handler?.();
});

export const showLoading = (title = "Waiting for camera", text = "Allow camera access when your browser asks.") => {
  retryHandler = null;
  DOM.viewfinderState.dataset.state = 'loading';
  DOM.stateTitle.textContent = title;
  DOM.stateText.textContent = text;
  DOM.retryBtn.hidden = true;
  DOM.viewfinderState.hidden = false;
};

// Shows the error state over the frame. With `onRetry`, a "Try again"
// button is offered that calls it.
export const showError = (title, message, onRetry = null) => {
  retryHandler = onRetry;
  DOM.viewfinderState.dataset.state = 'error';
  DOM.stateTitle.textContent = title;
  DOM.stateText.textContent = message;
  DOM.retryBtn.hidden = !onRetry;
  DOM.viewfinderState.hidden = false;
  // Camera loss can happen while a dialog is open; leave its focus alone.
  if (onRetry && !document.querySelector('[aria-modal="true"]:not([hidden])')) {
    DOM.retryBtn.focus();
  }
};

export const hideState = () => {
  retryHandler = null;
  DOM.viewfinderState.hidden = true;
};

// ----------------------------------------------------------------------------
// Status toast
// ----------------------------------------------------------------------------

const TOAST_ICONS = {
  info: 'i-info',
  success: 'i-check',
  error: 'i-alert'
};

let statusTimer = null;

export const setStatus = (message, duration = 0, kind = 'info') => {
  // Cancel the previous message's auto-clear so it can't wipe this one.
  clearTimeout(statusTimer);
  statusTimer = null;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${TOAST_ICONS[kind] || TOAST_ICONS.info}`);
  svg.append(use);
  const text = document.createElement('span');
  text.textContent = message;
  DOM.status.dataset.kind = kind;
  // The toast stays in the accessibility tree while idle (faded out, not
  // display:none), so replacing its content is what gets announced.
  DOM.status.dataset.visible = 'true';
  DOM.status.replaceChildren(svg, text);

  if (duration > 0) {
    statusTimer = setTimeout(clearStatus, duration);
  }
};

export const clearStatus = () => {
  clearTimeout(statusTimer);
  statusTimer = null;
  DOM.status.dataset.visible = 'false';
  DOM.status.replaceChildren();
};

// ----------------------------------------------------------------------------
// Render loop pausing
// ----------------------------------------------------------------------------

// Several overlays (About modal, photo review, texture swaps, a lost
// camera) want the ticker stopped while they are up. Track them by name
// so that closing one overlay can't restart rendering under another.
const renderPauses = new Set();

export const pauseRendering = (reason) => {
  renderPauses.add(reason);
  state.app?.ticker.stop();
};

export const resumeRendering = (reason) => {
  renderPauses.delete(reason);
  if (renderPauses.size === 0 && state.currentStream) state.app?.ticker.start();
};

// ----------------------------------------------------------------------------
// Misc
// ----------------------------------------------------------------------------

export const randomInRange = (min, max) => min + Math.random() * (max - min);

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

// Keyboard focus trap for dialogs: Tab wraps around inside `root`.
const trapFocus = (root, event) => {
  const focusable = Array.from(root.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])'))
    .filter((el) => !el.disabled && !el.hidden && el.offsetParent !== null);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

// Shared open/close lifecycle for the About modal, the photo review and
// the settings sheet: toggles `hidden`, remembers and restores focus,
// traps Tab inside, closes on Escape, and optionally pauses rendering
// (for overlays that fully cover the canvas) while open.
export const createDialog = (root, { initialFocus, pauseKey = null, onOpen, onClose } = {}) => {
  let lastFocusedElement = null;

  const isOpen = () => !root.hidden;

  const open = () => {
    if (isOpen()) return;
    lastFocusedElement = document.activeElement;
    root.hidden = false;
    onOpen?.();
    (initialFocus?.() || root.querySelector('button, a[href], input'))?.focus();
    if (pauseKey) pauseRendering(pauseKey);
  };

  const close = () => {
    if (!isOpen()) return;
    root.hidden = true;
    onClose?.();
    if (pauseKey) resumeRendering(pauseKey);
    if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
    lastFocusedElement = null;
  };

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Tab') {
      trapFocus(root, e);
    }
  });

  return { open, close, isOpen, toggle: () => (isOpen() ? close() : open()) };
};

// Renders a radio group of `label > hidden input + span` options into
// `container`. When the same options are already there, only `checked`
// is updated, so a re-render never destroys the input that has focus.
export const renderRadioGroup = (container, name, options, current) => {
  const inputs = Array.from(container.querySelectorAll('input[type="radio"]'));
  const sameOptions = inputs.length === options.length &&
    inputs.every((input, i) => input.value === options[i].value);

  if (sameOptions) {
    inputs.forEach((input) => { input.checked = input.value === current; });
    return;
  }

  container.replaceChildren(...options.map((option) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = option.value;
    input.checked = option.value === current;
    input.className = 'visually-hidden';
    const text = document.createElement('span');
    text.textContent = option.label;
    label.append(input, text);
    return label;
  }));
};

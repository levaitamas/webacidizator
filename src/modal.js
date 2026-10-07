// ============================================================================
// Modal Functions
// ============================================================================

import { DOM } from "./dom.js";
import { state } from "./state.js";

let lastFocusedElement = null;

const getModalFocusableElements = () =>
  Array.from(DOM.aboutModal.querySelectorAll('button, a[href]'))
    .filter((el) => !el.hasAttribute('disabled'));

const trapModalFocus = (e) => {
  const focusable = getModalFocusableElements();
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
};

const openModal = () => {
  lastFocusedElement = document.activeElement;
  DOM.aboutModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  DOM.closeModal.focus();
  // The modal fully covers the canvas, so there's no point spending GPU
  // time re-rendering the live glitch feed (and re-compositing it under
  // the modal's backdrop-filter blur) while it's hidden.
  state.app?.ticker.stop();
};

const closeModal = () => {
  DOM.aboutModal.classList.remove('active');
  document.body.style.overflow = '';
  lastFocusedElement?.focus();
  lastFocusedElement = null;
  // Don't resume rendering if the camera was lost meanwhile.
  if (state.currentStream) state.app?.ticker.start();
};

// Close modal when clicking outside content
DOM.aboutModal.addEventListener('click', (e) => {
  if (e.target === DOM.aboutModal) {
    closeModal();
  }
});

// Close modal with close button
DOM.closeModal.addEventListener('click', closeModal);

// Close modal with Escape key, and keep keyboard focus trapped inside
// the modal while it's open.
document.addEventListener('keydown', (e) => {
  if (!DOM.aboutModal.classList.contains('active')) return;

  if (e.key === 'Escape') {
    closeModal();
  } else if (e.key === 'Tab') {
    trapModalFocus(e);
  }
});

// Open modal with About button
DOM.aboutBtn.addEventListener('click', openModal);

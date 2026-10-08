// ============================================================================
// Frame Ratio
// ============================================================================
//
// The original Acidizator photos are square, so 1:1 is the default. The
// other ratios follow the camera's orientation the way a phone camera
// does: "4:3" is 4:3 with a landscape sensor and 3:4 with a portrait one.

import { DOM } from "./dom.js";
import { state } from "./state.js";
import { renderRadioGroup } from "./utils.js";

const RATIOS = [
  { id: '1:1', value: 1 },
  { id: '4:3', value: 4 / 3 },
  { id: '3:2', value: 3 / 2 },
  { id: '16:9', value: 16 / 9 }
];

const STORAGE_KEY = 'webacidizator.frameRatio';

const loadRatio = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return RATIOS.find(r => r.id === saved) || RATIOS[0];
  } catch {
    return RATIOS[0];
  }
};

let currentRatio = loadRatio();
let appliedRatio = null;

const saveRatio = () => {
  try {
    localStorage.setItem(STORAGE_KEY, currentRatio.id);
  } catch {
    // Private mode or blocked storage: the choice just won't persist.
  }
};

const videoIsPortrait = () =>
  DOM.webcam.videoWidth > 0 && DOM.webcam.videoHeight > DOM.webcam.videoWidth;

// Applies the chosen ratio to the frame element and resizes the renderer
// to match. Safe to call before the renderer exists.
export const applyFrameRatio = () => {
  const ratio = videoIsPortrait() ? 1 / currentRatio.value : currentRatio.value;
  if (ratio !== appliedRatio) {
    appliedRatio = ratio;
    DOM.container.style.setProperty('--frame-ratio', String(ratio));
    // The Pixi resize plugin only listens for window resizes, so a frame
    // whose CSS size changed under it must be resized explicitly. (Its
    // "resize" event then lays out the sprite; see main.js.)
    state.app?.resize();
  }
  state.resizeHandler?.();
};

const renderMenu = () => {
  DOM.ratioBtn.textContent = currentRatio.id;
  renderRadioGroup(DOM.ratioMenu, 'frameRatio',
    RATIOS.map((ratio) => ({ value: ratio.id, label: ratio.id })), currentRatio.id);
};

const setMenuOpen = (open) => {
  DOM.ratioMenu.hidden = !open;
  DOM.ratioBtn.setAttribute('aria-expanded', String(open));
  if (open) DOM.ratioMenu.querySelector('input:checked')?.focus();
};

const isMenuOpen = () => !DOM.ratioMenu.hidden;

const closeMenu = () => {
  setMenuOpen(false);
  DOM.ratioBtn.focus();
};

const selectRatio = (ratio) => {
  currentRatio = ratio;
  saveRatio();
  DOM.ratioBtn.textContent = ratio.id;
  applyFrameRatio();
};

export const setupFrameRatio = () => {
  renderMenu();
  applyFrameRatio();

  DOM.ratioBtn.addEventListener('click', () => setMenuOpen(!isMenuOpen()));

  // Arrow keys move the native radio selection; apply it live.
  DOM.ratioMenu.addEventListener('change', (e) => {
    const ratio = RATIOS.find(r => r.id === e.target.value);
    if (ratio) selectRatio(ratio);
  });

  // A pointer pick is done in one tap, so close the menu; keyboard users
  // keep it open until Enter or Escape.
  DOM.ratioMenu.addEventListener('click', (e) => {
    if (e.target.closest('label')) closeMenu();
  });

  DOM.ratioMenu.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      closeMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (!isMenuOpen()) return;
    if (DOM.ratioMenu.contains(e.target) || DOM.ratioBtn.contains(e.target)) return;
    setMenuOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen()) closeMenu();
  });
};

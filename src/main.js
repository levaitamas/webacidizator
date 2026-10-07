// ============================================================================
// Application Initialization
// ============================================================================

import {
  Application,
  NoiseFilter
} from "https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs";

import { CONFIG, STARTUP_ERROR_MESSAGES } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";
import { rafThrottle, showError } from "./utils.js";
import { createColorMatrix, createPixelSortFilter, randomizePixelSortParams } from "./filters.js";
import { capturePhoto } from "./capture.js";
import { checkMultipleCameras, getCameraStream, stopStream } from "./camera.js";
import { detectCameraCapabilities, setupCameraControlListeners } from "./camera-controls.js";
import { attachStream, createResizeHandler, createVideoSprite, switchCamera } from "./rendering.js";
import "./modal.js";

const initializePixiJS = async () => {
  state.app = new Application();
  await state.app.init({
    resizeTo: DOM.container,
    backgroundAlpha: 0,
    antialias: true
  });
  state.app.ticker.maxFPS = CONFIG.FPS;
  DOM.container.replaceChildren(state.app.canvas);
};

const createFilters = () => {
  state.colorMatrix = createColorMatrix();
  state.noiseFilter = new NoiseFilter({ noise: CONFIG.NOISE_AMOUNT });
  state.pixelSortFilter = createPixelSortFilter();
};

const setupSprite = () => {
  const { texture, sprite } = createVideoSprite();
  state.texture = texture;
  state.sprite = sprite;
  state.app.stage.addChild(state.sprite);
};

const setupEventListeners = () => {
  DOM.captureBtn.addEventListener('click', capturePhoto);
  DOM.switchCameraBtn.addEventListener('click', switchCamera);
  setupCameraControlListeners();

  state.resizeHandler = createResizeHandler();

  if (DOM.webcam.readyState >= 1) {
    state.resizeHandler();
  } else {
    DOM.webcam.addEventListener("loadedmetadata", state.resizeHandler, { once: true });
  }

  window.addEventListener("resize", rafThrottle(() => state.resizeHandler()));
  window.addEventListener('beforeunload', () => {
    stopStream();
    if (state.texture) {
      state.texture.destroy(true);
    }
  });

  // Re-scan for cameras when one is plugged/unplugged so the "Switch
  // Camera" button reflects reality instead of only the startup snapshot.
  navigator.mediaDevices.addEventListener('devicechange', checkMultipleCameras);
};

const setupAnimationLoop = () => {
  let frameCount = 0;

  state.app.ticker.add(() => {
    if (DOM.webcam.readyState >= 2 && state.texture?.source) {
      state.texture.source.update();
    }

    state.noiseFilter.seed = Math.random();

    frameCount++;
    if (frameCount % CONFIG.PARAM_CHANGE_INTERVAL === 0) {
      randomizePixelSortParams(state.pixelSortFilter);
    }
  });
};

const start = async () => {
  try {
    attachStream(await getCameraStream());
    await DOM.webcam.play();

    await checkMultipleCameras();

    detectCameraCapabilities();

    await initializePixiJS();

    createFilters();
    setupSprite();

    DOM.captureBtn.disabled = false;
    DOM.switchCameraBtn.disabled = false;

    setupEventListeners();

    setupAnimationLoop();
  } catch (error) {
    console.error("Unable to start webcam:", error);
    const hint = STARTUP_ERROR_MESSAGES[error.name] ||
      "We couldn't access your camera. Please check your browser settings.";
    showError(hint);
  }
};

// ============================================================================
// Application Entry Point
// ============================================================================

if (!navigator.mediaDevices?.getUserMedia) {
  showError("Your browser doesn't support camera access via getUserMedia.");
} else {
  start();
}

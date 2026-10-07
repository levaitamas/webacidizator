// ============================================================================
// Application Initialization
// ============================================================================

import {
  Application
} from "https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs";

import { CONFIG, STARTUP_ERROR_MESSAGES } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";
import { rafThrottle, showError } from "./utils.js";
import { createGlitchFilter, randomizeNoiseSeed, randomizePixelSortParams } from "./filters.js";
import { capturePhoto } from "./capture.js";
import { checkMultipleCameras, getCameraStream, stopStream } from "./camera.js";
import { detectCameraCapabilities, setupCameraControlListeners } from "./camera-controls.js";
import { attachStream, createResizeHandler, createVideoSprite, reopenCamera, switchCamera } from "./rendering.js";
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
  state.glitchFilter = createGlitchFilter();
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
  // Release the camera when the page is hidden for navigation. Unlike
  // beforeunload, pagehide also fires when the page enters the
  // back/forward cache; if it is restored from there, reopen the camera
  // instead of showing a dead feed. GPU resources are freed by the
  // browser on unload, and must stay intact for a restore.
  window.addEventListener('pagehide', stopStream);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && !state.currentStream) {
      reopenCamera(state.availableCameras[state.currentCameraIndex]?.deviceId);
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

    randomizeNoiseSeed(state.glitchFilter);

    frameCount++;
    if (frameCount % CONFIG.PARAM_CHANGE_INTERVAL === 0) {
      randomizePixelSortParams(state.glitchFilter);
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

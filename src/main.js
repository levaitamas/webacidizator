// ============================================================================
// Application Initialization
// ============================================================================

import {
  Application
} from "https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs";

import { CONFIG, STARTUP_ERROR_MESSAGES } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";
import { hideState, pauseRendering, resumeRendering, showError, showLoading } from "./utils.js";
import { createGlitchFilter, randomizeNoiseSeed, randomizePixelSortParams } from "./filters.js";
import { setupCaptureListeners } from "./capture.js";
import { checkMultipleCameras, getCameraStream, stopStream } from "./camera.js";
import { detectCameraCapabilities, setupCameraControlListeners } from "./camera-controls.js";
import { attachStream, createResizeHandler, createVideoSprite, reopenCamera, switchCamera } from "./rendering.js";
import { applyFrameRatio, setupFrameRatio } from "./frame.js";
import "./modal.js";

const initializePixiJS = async () => {
  const app = new Application();
  await app.init({
    resizeTo: DOM.container,
    backgroundAlpha: 0,
    // The stage is a single full-canvas sprite, so multisampling has no
    // edges to smooth and would only cost GPU time and memory.
    antialias: false
  });
  app.ticker.maxFPS = CONFIG.FPS;
  DOM.container.replaceChildren(app.canvas);
  state.app = app;
};

const setupSprite = () => {
  state.glitchFilter = createGlitchFilter();
  const { texture, sprite } = createVideoSprite();
  state.texture = texture;
  state.sprite = sprite;
  state.app.stage.addChild(state.sprite);
};

const setupEventListeners = () => {
  setupCaptureListeners();
  DOM.switchCameraBtn.addEventListener('click', switchCamera);
  setupCameraControlListeners();

  state.resizeHandler = createResizeHandler();

  // Pixi's resize plugin resizes the canvas on window resizes; lay the
  // sprite out again whenever the renderer changes size for any reason.
  state.app.renderer.on('resize', () => state.resizeHandler());

  // A new stream, or a rotated phone re-orienting the current one,
  // changes the video dimensions and with them the effective frame ratio.
  DOM.webcam.addEventListener("loadedmetadata", applyFrameRatio);
  DOM.webcam.addEventListener("resize", applyFrameRatio);

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

const startupErrorText = (error) => {
  if (STARTUP_ERROR_MESSAGES[error.name]) return STARTUP_ERROR_MESSAGES[error.name];
  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser doesn't support camera access. Try a current version of Chrome, Safari, Firefox or Edge.";
  }
  return "We couldn't access your camera. Check your browser's site settings and try again.";
};

// One-time setup of the renderer, sprite, render loop and listeners.
// Runs after the first camera stream is playing, so the sprite's video
// texture has frames to upload from.
let initialized = false;

const initialize = async () => {
  if (initialized) return;
  if (!state.app) await initializePixiJS();
  setupSprite();
  setupAnimationLoop();
  setupEventListeners();
  initialized = true;
};

// Opens the camera and, on first success, finishes initialization. The
// "Try again" button runs this again after a failure.
const openCamera = async () => {
  showLoading();
  pauseRendering('camera');

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia is not supported");
    }

    // Set up WebGL while the user is still answering the camera prompt.
    // Wait for both, so a quick camera failure can't have its error
    // message replaced by the canvas mounted afterwards.
    const [camera, pixi] = await Promise.allSettled([
      getCameraStream(),
      state.app ? Promise.resolve() : initializePixiJS()
    ]);
    if (camera.status === 'rejected') throw camera.reason;
    attachStream(camera.value);
    if (pixi.status === 'rejected') throw pixi.reason;

    await DOM.webcam.play();

    await checkMultipleCameras();

    detectCameraCapabilities();

    await initialize();

    hideState();
    applyFrameRatio();
    resumeRendering('camera');

    DOM.captureBtn.disabled = false;
    DOM.switchCameraBtn.disabled = false;
  } catch (error) {
    console.error("Unable to start webcam:", error);
    stopStream();
    pauseRendering('camera');
    const title = error.name === 'NotAllowedError' ? "Camera access needed" : "Camera unavailable";
    const canRetry = !!navigator.mediaDevices?.getUserMedia;
    showError(title, startupErrorText(error), canRetry ? openCamera : null);
  }
};

// ============================================================================
// Application Entry Point
// ============================================================================

setupFrameRatio();
openCamera();

// ============================================================================
// Rendering & Texture Management
// ============================================================================

import {
  Sprite,
  Texture
} from "https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs";

import { CONFIG, ERROR_MESSAGES } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";
import {
  hideState, nextAnimationFrame, pauseRendering, resumeRendering, setStatus, showError, waitForVideoFrame
} from "./utils.js";
import { checkMultipleCameras, getCameraStream, stopStream } from "./camera.js";
import { detectCameraCapabilities } from "./camera-controls.js";
import { applyFrameRatio } from "./frame.js";

// User-facing cameras (and desktop webcams, which report no facing mode)
// are mirrored like a selfie preview; what you see is what gets saved.
const isMirrored = () => {
  const facing = state.currentStream?.getVideoTracks()[0]?.getSettings?.().facingMode;
  return facing !== 'environment';
};

export const createResizeHandler = () => {
  return () => {
    if (!state.sprite || !state.app) return;

    const { width, height } = state.app.renderer;
    state.sprite.position.set(width / 2, height / 2);

    const videoWidth = DOM.webcam.videoWidth || 640;
    const videoHeight = DOM.webcam.videoHeight || 480;
    const videoAspect = videoWidth / videoHeight;
    const viewAspect = width / height;

    // Cover the frame: scale by whichever dimension is tighter and crop
    // the rest, so the chosen ratio never shows letterboxing.
    if (viewAspect > videoAspect) {
      state.sprite.width = width * CONFIG.SCALE_FACTOR;
      state.sprite.height = state.sprite.width / videoAspect;
    } else {
      state.sprite.height = height * CONFIG.SCALE_FACTOR;
      state.sprite.width = state.sprite.height * videoAspect;
    }

    if (isMirrored()) state.sprite.scale.x = -Math.abs(state.sprite.scale.x);
  };
};

// Creates a fresh sprite backed by a texture of the current webcam frame,
// wired up with the shared filter pipeline. Used both on initial setup
// and whenever the video texture is recreated after a camera switch.
export const createVideoSprite = () => {
  const texture = Texture.from(DOM.webcam);
  // The render loop already uploads a fresh video frame every tick (see
  // setupAnimationLoop), capped to CONFIG.FPS. Pixi's own autoUpdate
  // would otherwise *also* upload a new frame on every real video frame
  // (via requestVideoFrameCallback), duplicating that work.
  texture.source.autoUpdate = false;
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.filters = [state.glitchFilter];
  return { texture, sprite };
};

const updateVideoTexture = async () => {
  try {
    DOM.webcam.pause();
    pauseRendering('texture');

    await nextAnimationFrame();

    if (state.texture) {
      state.texture.destroy(true);
      state.texture = null;
    }

    if (state.sprite) {
      if (state.app.stage.children.includes(state.sprite)) {
        state.app.stage.removeChild(state.sprite);
      }
      state.sprite.destroy({ children: true });
      state.sprite = null;
    }

    state.app.renderer.clear();

    await DOM.webcam.play();

    if (DOM.webcam.readyState < 3) {
      await new Promise((resolve) => {
        DOM.webcam.addEventListener('canplay', resolve, { once: true });
      });
    }

    await waitForVideoFrame(DOM.webcam);

    const { texture, sprite } = createVideoSprite();
    state.texture = texture;
    state.sprite = sprite;
    state.app.stage.addChild(state.sprite);

    // The new camera may have a different orientation, which flips the
    // effective frame ratio; this also runs the resize handler.
    applyFrameRatio();

    state.app.renderer.render(state.app.stage);
  } catch (error) {
    console.error('Failed to update video texture:', error);
    throw error;
  } finally {
    resumeRendering('texture');
  }
};

// Makes `stream` the active camera feed and watches its video track for
// the camera going away (unplugged, permission revoked, taken over by
// the OS), which would otherwise silently freeze the feed. Tracks we
// stop ourselves via stopStream() don't fire "ended".
export const attachStream = (stream) => {
  state.currentStream = stream;
  DOM.webcam.srcObject = stream;
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (state.currentStream === stream) handleCameraEnded();
  }, { once: true });
};

const setCameraButtonsEnabled = (enabled) => {
  DOM.captureBtn.disabled = !enabled;
  DOM.switchCameraBtn.disabled = !enabled;
};

// Opens a camera as the new feed (the given device, or by default any
// camera, preferring the rear one), or enters the camera lost state if
// none can be opened. Resolves to whether a camera is running again.
export const reopenCamera = async (deviceId = null) => {
  setCameraButtonsEnabled(false);
  stopStream();

  try {
    attachStream(await getCameraStream(deviceId));
    if (!state.app) return false; // still starting up; start() takes it from here

    detectCameraCapabilities();
    await updateVideoTexture();
    await checkMultipleCameras();

    hideState();
    resumeRendering('camera');
    setCameraButtonsEnabled(true);
    return true;
  } catch (error) {
    console.error('Failed to reopen camera:', error);
    showCameraLost();
    return false;
  }
};

const handleCameraEnded = async () => {
  console.warn('Active camera ended, trying another one');
  if (await reopenCamera()) {
    setStatus('Camera disconnected, switched to another one', CONFIG.DELAYS.ERROR_MESSAGE, 'info');
  }
};

export const switchCamera = async () => {
  // The camera list can shrink (devicechange) while the button is shown;
  // with no other camera there is nothing to switch to, and an empty
  // list would make the index below NaN.
  if (state.availableCameras.length < 2) return;

  const previousIndex = state.currentCameraIndex;
  const nextIndex = (previousIndex + 1) % state.availableCameras.length;
  const nextCamera = state.availableCameras[nextIndex];

  try {
    setCameraButtonsEnabled(false);
    setStatus('Switching camera…');

    state.currentCameraIndex = nextIndex;

    stopStream();

    attachStream(await getCameraStream(nextCamera.deviceId));

    detectCameraCapabilities();

    await updateVideoTexture();

    setStatus(nextCamera.label, CONFIG.DELAYS.STATUS_MESSAGE, 'success');
  } catch (error) {
    console.error("Camera switch failed:", error);
    const message = ERROR_MESSAGES[error.name] || "Camera switch failed";
    setStatus(message, CONFIG.DELAYS.ERROR_MESSAGE, 'error');
    await recoverPreviousCamera(previousIndex);
  } finally {
    // Leave the buttons disabled if the camera could not be recovered.
    if (state.currentStream) setCameraButtonsEnabled(true);
  }
};

// If acquiring the next camera's stream failed, `stopStream()` already
// released the old tracks, leaving `DOM.webcam.srcObject` pointing at a
// dead stream (frozen frame, no recovery). Try to reopen the previous
// camera so the app doesn't end up in a broken, unrecoverable state.
const recoverPreviousCamera = async (previousIndex) => {
  if (state.currentStream) return;

  const previousCamera = state.availableCameras[previousIndex];
  if (!previousCamera) return;

  try {
    attachStream(await getCameraStream(previousCamera.deviceId));
    state.currentCameraIndex = previousIndex;

    detectCameraCapabilities();
    await updateVideoTexture();
  } catch (error) {
    console.error("Failed to restore previous camera:", error);
    showCameraLost();
  }
};

// No usable stream. Stop rendering into the (soon detached) canvas and
// keep the camera-dependent buttons disabled so e.g. capturing can't
// download a blank frame. "Try again" reopens any available camera.
export const showCameraLost = () => {
  stopStream();
  DOM.webcam.srcObject = null;
  pauseRendering('camera');
  setCameraButtonsEnabled(false);
  // No track, no capabilities: hides the zoom pill and settings button.
  detectCameraCapabilities();
  showError(
    "Camera disconnected",
    "The camera stopped sending video. Reconnect it, or try another camera.",
    () => reopenCamera()
  );
};

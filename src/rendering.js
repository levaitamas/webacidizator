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
import { nextAnimationFrame, setStatus, showError, waitForVideoFrame } from "./utils.js";
import { checkMultipleCameras, getCameraStream, stopStream } from "./camera.js";
import { detectCameraCapabilities } from "./camera-controls.js";

export const createResizeHandler = () => {
  return () => {
    if (!state.sprite || !state.app) return;

    const { width, height } = state.app.renderer;
    state.sprite.position.set(width / 2, height / 2);

    const videoWidth = DOM.webcam.videoWidth || 640;
    const videoHeight = DOM.webcam.videoHeight || 480;
    const videoAspect = videoWidth / videoHeight;
    const viewAspect = width / height;

    if (viewAspect > videoAspect) {
      state.sprite.width = width * CONFIG.SCALE_FACTOR;
      state.sprite.height = state.sprite.width / videoAspect;
    } else {
      state.sprite.height = height * CONFIG.SCALE_FACTOR;
      state.sprite.width = state.sprite.height * videoAspect;
    }
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
  sprite.filters = [state.colorMatrix, state.noiseFilter, state.pixelSortFilter];
  return { texture, sprite };
};

// The About modal pauses rendering while it covers the canvas (see
// modal.js), so only restart the ticker when it isn't open.
const resumeRendering = () => {
  if (!DOM.aboutModal.classList.contains('active')) state.app.ticker.start();
};

const updateVideoTexture = async () => {
  try {
    DOM.webcam.pause();
    state.app.ticker.stop();

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

    if (state.resizeHandler) {
      state.resizeHandler();
    }

    state.app.renderer.render(state.app.stage);
    resumeRendering();
  } catch (error) {
    console.error('Failed to update video texture:', error);
    if (state.app?.ticker) {
      resumeRendering();
    }
    throw error;
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

// Opens a camera as the new feed (the given device, or by default any
// camera, preferring the rear one), or enters the camera lost state if
// none can be opened. Resolves to whether a camera is running again.
export const reopenCamera = async (deviceId = null) => {
  DOM.switchCameraBtn.disabled = true;
  DOM.captureBtn.disabled = true;
  stopStream();

  try {
    attachStream(await getCameraStream(deviceId));
    if (!state.app) return false; // still starting up; start() takes it from here

    detectCameraCapabilities();
    await updateVideoTexture();
    await checkMultipleCameras();

    DOM.switchCameraBtn.disabled = false;
    DOM.captureBtn.disabled = false;
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
    setStatus('⚠️ Camera disconnected, switched to another one', CONFIG.DELAYS.ERROR_MESSAGE);
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
    DOM.switchCameraBtn.disabled = true;
    DOM.captureBtn.disabled = true;
    setStatus('🔄 Switching camera...');

    state.currentCameraIndex = nextIndex;

    stopStream();

    attachStream(await getCameraStream(nextCamera.deviceId));

    detectCameraCapabilities();

    await updateVideoTexture();

    setStatus(`✅ ${nextCamera.label}`, CONFIG.DELAYS.STATUS_MESSAGE);
  } catch (error) {
    console.error("Camera switch failed:", error);
    const message = ERROR_MESSAGES[error.name] || "Camera switch failed";
    setStatus(`❌ ${message}`, CONFIG.DELAYS.ERROR_MESSAGE);
    await recoverPreviousCamera(previousIndex);
  } finally {
    // Leave the buttons disabled if the camera could not be recovered.
    if (state.currentStream) {
      DOM.switchCameraBtn.disabled = false;
      DOM.captureBtn.disabled = false;
    }
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

// Terminal state: no usable stream. Stop rendering into the (soon
// detached) canvas and keep the camera-dependent buttons disabled so
// e.g. capturing can't download a blank frame.
export const showCameraLost = () => {
  stopStream();
  DOM.webcam.srcObject = null;
  state.app?.ticker.stop();
  DOM.captureBtn.disabled = true;
  DOM.switchCameraBtn.disabled = true;
  showError("Camera connection lost. Please refresh the page.");
};

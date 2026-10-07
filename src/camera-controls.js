// ============================================================================
// Camera Controls (zoom, torch, focus, exposure)
// ============================================================================

import { CONFIG, FOCUS_MODE_ORDER, EXPOSURE_MODE_ORDER } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";
import { setStatus } from "./utils.js";

const getVideoTrack = () => state.currentStream?.getVideoTracks()[0] || null;

const clampToCapability = (value, cap) => {
  let clamped = Math.min(Math.max(value, cap.min), cap.max);
  if (cap.step) {
    clamped = cap.min + Math.round((clamped - cap.min) / cap.step) * cap.step;
  }
  return Math.round(clamped * 1000) / 1000;
};

const rangeCapability = (cap) =>
  cap && typeof cap === 'object' && cap.min < cap.max ? cap : null;

const supportedFocusModes = () =>
  FOCUS_MODE_ORDER.filter(mode => state.cameraCapabilities?.focusMode?.includes(mode));

const supportedExposureModes = () =>
  EXPOSURE_MODE_ORDER.filter(mode => state.cameraCapabilities?.exposureMode?.includes(mode));

const applyCameraConstraint = async (constraints) => {
  const track = getVideoTrack();
  if (!track?.applyConstraints) return false;
  try {
    await track.applyConstraints(constraints);
    updateCameraControlsUI();
    return true;
  } catch (error) {
    console.warn('Camera control change failed:', error);
    const message = error.name === 'OverconstrainedError'
      ? 'Camera control not supported on this device'
      : 'Camera control change failed';
    setStatus(`❌ ${message}`, CONFIG.DELAYS.ERROR_MESSAGE);
    return false;
  }
};

export const detectCameraCapabilities = () => {
  const track = getVideoTrack();
  state.cameraCapabilities = typeof track?.getCapabilities === 'function'
    ? track.getCapabilities()
    : null;
  updateCameraControlsUI();
};

const updateCameraControlsUI = () => {
  const caps = state.cameraCapabilities;
  const settings = getVideoTrack()?.getSettings() || {};
  const visibleGroups = [];

  const zoomCap = rangeCapability(caps?.zoom);
  DOM.zoomGroup.style.display = zoomCap ? 'flex' : 'none';
  if (zoomCap) {
    DOM.zoomSlider.min = zoomCap.min;
    DOM.zoomSlider.max = zoomCap.max;
    DOM.zoomSlider.step = zoomCap.step || 0.1;
    const zoom = settings.zoom ?? zoomCap.min;
    DOM.zoomSlider.value = zoom;
    DOM.zoomValue.textContent = `${Number(zoom) % 1 === 0 ? Number(zoom).toFixed(1) : Number(zoom).toFixed(2)}×`;
    visibleGroups.push(DOM.zoomGroup);
  }

  const hasTorch = caps?.torch === true;
  DOM.torchGroup.style.display = hasTorch ? 'flex' : 'none';
  if (hasTorch) {
    const torchOn = settings.torch === true;
    DOM.torchBtn.classList.toggle('active', torchOn);
    DOM.torchBtn.setAttribute('aria-pressed', String(torchOn));
    DOM.torchBtn.textContent = torchOn ? '🔦 On' : '🔦 Off';
    visibleGroups.push(DOM.torchGroup);
  }

  const focusModes = supportedFocusModes();
  DOM.focusGroup.style.display = focusModes.length >= 2 ? 'flex' : 'none';
  if (focusModes.length >= 2) {
    const mode = focusModes.includes(settings.focusMode) ? settings.focusMode : focusModes[0];
    DOM.focusBtn.textContent = `🎯 ${mode[0].toUpperCase()}${mode.slice(1)}`;
    visibleGroups.push(DOM.focusGroup);
  }

  const focusDistanceCap = rangeCapability(caps?.focusDistance);
  const manualFocus = settings.focusMode === 'manual';
  DOM.focusDistanceGroup.style.display = focusDistanceCap && manualFocus ? 'flex' : 'none';
  if (focusDistanceCap && manualFocus) {
    DOM.focusDistanceSlider.min = focusDistanceCap.min;
    DOM.focusDistanceSlider.max = focusDistanceCap.max;
    DOM.focusDistanceSlider.step = focusDistanceCap.step || 0.01;
    const focusDistance = settings.focusDistance ?? focusDistanceCap.min;
    DOM.focusDistanceSlider.value = focusDistance;
    DOM.focusDistanceValue.textContent = Number(focusDistance).toFixed(2);
    visibleGroups.push(DOM.focusDistanceGroup);
  }

  const exposureModes = supportedExposureModes();
  DOM.exposureGroup.style.display = exposureModes.length >= 2 ? 'flex' : 'none';
  if (exposureModes.length >= 2) {
    const mode = exposureModes.includes(settings.exposureMode) ? settings.exposureMode : exposureModes[0];
    DOM.exposureBtn.textContent = mode === 'auto' ? '☀️ Auto' : '☀️ Manual';
    visibleGroups.push(DOM.exposureGroup);
  }

  const exposureCompCap = rangeCapability(caps?.exposureCompensation);
  const manualExposure = settings.exposureMode === 'manual';
  DOM.exposureCompGroup.style.display = exposureCompCap && manualExposure ? 'flex' : 'none';
  if (exposureCompCap && manualExposure) {
    DOM.exposureCompSlider.min = exposureCompCap.min;
    DOM.exposureCompSlider.max = exposureCompCap.max;
    DOM.exposureCompSlider.step = exposureCompCap.step || 0.1;
    const exposureCompensation = settings.exposureCompensation ?? exposureCompCap.min;
    DOM.exposureCompSlider.value = exposureCompensation;
    DOM.exposureCompValue.textContent = Number(exposureCompensation).toFixed(1);
    visibleGroups.push(DOM.exposureCompGroup);
  }

  DOM.cameraControls.style.display = visibleGroups.length > 0 ? 'flex' : 'none';
};

export const setupCameraControlListeners = () => {
  DOM.zoomSlider.addEventListener('change', async () => {
    const cap = rangeCapability(state.cameraCapabilities?.zoom);
    if (!cap) return;
    const ok = await applyCameraConstraint({ zoom: clampToCapability(Number(DOM.zoomSlider.value), cap) });
    if (!ok) updateCameraControlsUI();
  });

  DOM.torchBtn.addEventListener('click', async () => {
    const settings = getVideoTrack()?.getSettings() || {};
    const ok = await applyCameraConstraint({ torch: settings.torch !== true });
    if (!ok) updateCameraControlsUI();
  });

  DOM.focusBtn.addEventListener('click', async () => {
    const modes = supportedFocusModes();
    if (modes.length < 2) return;
    const settings = getVideoTrack()?.getSettings() || {};
    const current = modes.includes(settings.focusMode) ? settings.focusMode : modes[0];
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    const ok = await applyCameraConstraint({ focusMode: next });
    if (!ok) updateCameraControlsUI();
  });

  DOM.focusDistanceSlider.addEventListener('change', async () => {
    const cap = rangeCapability(state.cameraCapabilities?.focusDistance);
    if (!cap) return;
    const ok = await applyCameraConstraint({ focusDistance: clampToCapability(Number(DOM.focusDistanceSlider.value), cap) });
    if (!ok) updateCameraControlsUI();
  });

  DOM.exposureBtn.addEventListener('click', async () => {
    const modes = supportedExposureModes();
    if (modes.length < 2) return;
    const settings = getVideoTrack()?.getSettings() || {};
    const current = modes.includes(settings.exposureMode) ? settings.exposureMode : modes[0];
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    const ok = await applyCameraConstraint({ exposureMode: next });
    if (!ok) updateCameraControlsUI();
  });

  DOM.exposureCompSlider.addEventListener('change', async () => {
    const cap = rangeCapability(state.cameraCapabilities?.exposureCompensation);
    if (!cap) return;
    const ok = await applyCameraConstraint({ exposureCompensation: clampToCapability(Number(DOM.exposureCompSlider.value), cap) });
    if (!ok) updateCameraControlsUI();
  });
};

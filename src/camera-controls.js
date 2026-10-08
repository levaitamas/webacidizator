// ============================================================================
// Camera Controls (zoom, torch, focus, exposure)
// ============================================================================
//
// Zoom lives on the viewfinder since it is a shooting control; the rest
// sit in the camera settings sheet. Every control is shown only when
// the active camera reports support for it.

import { CONFIG, FOCUS_MODE_ORDER, EXPOSURE_MODE_ORDER } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";
import { createDialog, renderRadioGroup, setStatus } from "./utils.js";

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

const formatZoom = (zoom) =>
  `${Number(zoom) % 1 === 0 ? Number(zoom).toFixed(1) : Number(zoom).toFixed(2)}×`;
const formatFocusDistance = (distance) => Number(distance).toFixed(2);
const formatExposureComp = (compensation) => {
  const value = Number(compensation);
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
};

const MODE_LABELS = {
  continuous: 'Auto',
  'single-shot': 'Single',
  manual: 'Manual'
};

const supportedFocusModes = () =>
  FOCUS_MODE_ORDER.filter(mode => state.cameraCapabilities?.focusMode?.includes(mode));

const supportedExposureModes = () =>
  EXPOSURE_MODE_ORDER.filter(mode => state.cameraCapabilities?.exposureMode?.includes(mode));

const applyCameraConstraint = async (constraints) => {
  const track = getVideoTrack();
  if (!track?.applyConstraints) return false;
  try {
    // applyConstraints() replaces the whole constraint set, so merge with
    // what is already applied; otherwise changing e.g. zoom would reset
    // torch or focus mode and drop the original deviceId/facingMode.
    const current = track.getConstraints?.() || {};
    await track.applyConstraints({
      ...current,
      advanced: [{ ...current.advanced?.[0], ...constraints }]
    });
    updateCameraControlsUI();
    return true;
  } catch (error) {
    console.warn('Camera control change failed:', error);
    const message = error.name === 'OverconstrainedError'
      ? 'This camera does not support that setting'
      : 'Camera setting could not be changed';
    setStatus(message, CONFIG.DELAYS.ERROR_MESSAGE, 'error');
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

const renderSegmented = (container, name, modes, current) =>
  renderRadioGroup(container, name, modes.map((mode) => ({ value: mode, label: MODE_LABELS[mode] || mode })), current);

const setupRange = (slider, output, cap, value, format) => {
  slider.min = cap.min;
  slider.max = cap.max;
  slider.step = cap.step || slider.step;
  slider.value = value;
  output.value = format(value);
};

const updateCameraControlsUI = () => {
  const caps = state.cameraCapabilities;
  const settings = getVideoTrack()?.getSettings() || {};
  let panelRows = 0;

  const zoomCap = rangeCapability(caps?.zoom);
  DOM.zoomGroup.hidden = !zoomCap;
  if (zoomCap) {
    setupRange(DOM.zoomSlider, DOM.zoomValue, { ...zoomCap, step: zoomCap.step || 0.1 },
      settings.zoom ?? zoomCap.min, formatZoom);
  }

  const hasTorch = caps?.torch === true;
  DOM.torchGroup.hidden = !hasTorch;
  if (hasTorch) {
    DOM.torchBtn.setAttribute('aria-checked', String(settings.torch === true));
    panelRows++;
  }

  const focusModes = supportedFocusModes();
  const showFocus = focusModes.length >= 2;
  DOM.focusGroup.hidden = !showFocus;
  if (showFocus) {
    const mode = focusModes.includes(settings.focusMode) ? settings.focusMode : focusModes[0];
    renderSegmented(DOM.focusModes, 'focusMode', focusModes, mode);
    panelRows++;
  }

  const focusDistanceCap = rangeCapability(caps?.focusDistance);
  const showFocusDistance = !!focusDistanceCap && settings.focusMode === 'manual';
  DOM.focusDistanceGroup.hidden = !showFocusDistance;
  if (showFocusDistance) {
    setupRange(DOM.focusDistanceSlider, DOM.focusDistanceValue,
      { ...focusDistanceCap, step: focusDistanceCap.step || 0.01 },
      settings.focusDistance ?? focusDistanceCap.min, formatFocusDistance);
    panelRows++;
  }

  const exposureModes = supportedExposureModes();
  const showExposure = exposureModes.length >= 2;
  DOM.exposureGroup.hidden = !showExposure;
  if (showExposure) {
    const mode = exposureModes.includes(settings.exposureMode) ? settings.exposureMode : exposureModes[0];
    renderSegmented(DOM.exposureModes, 'exposureMode', exposureModes, mode);
    panelRows++;
  }

  // Exposure compensation biases the automatic exposure, so it only
  // has an effect while exposure is not under manual control.
  const exposureCompCap = rangeCapability(caps?.exposureCompensation);
  const showExposureComp = !!exposureCompCap && settings.exposureMode !== 'manual';
  DOM.exposureCompGroup.hidden = !showExposureComp;
  if (showExposureComp) {
    setupRange(DOM.exposureCompSlider, DOM.exposureCompValue,
      { ...exposureCompCap, step: exposureCompCap.step || 0.1 },
      settings.exposureCompensation ?? exposureCompCap.min, formatExposureComp);
    panelRows++;
  }

  DOM.settingsBtn.hidden = panelRows === 0;
  if (panelRows === 0) settingsDialog.close();
};

// ----------------------------------------------------------------------------
// Settings sheet
// ----------------------------------------------------------------------------

// Rendering keeps running under the sheet so changes are seen live.
const settingsDialog = createDialog(DOM.settingsPanel, {
  initialFocus: () => DOM.settingsClose,
  onOpen: () => {
    DOM.settingsScrim.hidden = false;
    DOM.settingsBtn.setAttribute('aria-expanded', 'true');
  },
  onClose: () => {
    DOM.settingsScrim.hidden = true;
    DOM.settingsBtn.setAttribute('aria-expanded', 'false');
  }
});

export const isSettingsOpen = settingsDialog.isOpen;

const bindRange = (slider, output, format, capability, constraint) => {
  // Constraints are applied on "change" (release); meanwhile keep the
  // value label in sync with the slider while it is being dragged.
  slider.addEventListener('input', () => {
    output.value = format(slider.value);
  });
  slider.addEventListener('change', async () => {
    const cap = rangeCapability(capability());
    if (!cap) return;
    const ok = await applyCameraConstraint({ [constraint]: clampToCapability(Number(slider.value), cap) });
    if (!ok) updateCameraControlsUI();
  });
};

const bindSegmented = (container, supported, constraint) => {
  container.addEventListener('change', async (e) => {
    const mode = e.target.value;
    if (!supported().includes(mode)) return;
    const ok = await applyCameraConstraint({ [constraint]: mode });
    if (!ok) updateCameraControlsUI();
  });
};

export const setupCameraControlListeners = () => {
  bindRange(DOM.zoomSlider, DOM.zoomValue, formatZoom,
    () => state.cameraCapabilities?.zoom, 'zoom');
  bindRange(DOM.focusDistanceSlider, DOM.focusDistanceValue, formatFocusDistance,
    () => state.cameraCapabilities?.focusDistance, 'focusDistance');
  bindRange(DOM.exposureCompSlider, DOM.exposureCompValue, formatExposureComp,
    () => state.cameraCapabilities?.exposureCompensation, 'exposureCompensation');

  bindSegmented(DOM.focusModes, supportedFocusModes, 'focusMode');
  bindSegmented(DOM.exposureModes, supportedExposureModes, 'exposureMode');

  DOM.torchBtn.addEventListener('click', async () => {
    const settings = getVideoTrack()?.getSettings() || {};
    const ok = await applyCameraConstraint({ torch: settings.torch !== true });
    if (!ok) updateCameraControlsUI();
  });

  DOM.settingsBtn.addEventListener('click', settingsDialog.toggle);
  DOM.settingsClose.addEventListener('click', settingsDialog.close);
  DOM.settingsScrim.addEventListener('click', settingsDialog.close);
};

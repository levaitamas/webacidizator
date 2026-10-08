// ============================================================================
// DOM Elements
// ============================================================================

const byId = (id) => document.getElementById(id);

export const DOM = {
  container: byId("app"),
  viewfinder: byId("viewfinder"),
  webcam: byId("webcam"),
  flash: byId("flash"),
  status: byId("status"),

  // Top bar
  aboutBtn: byId("aboutBtn"),
  ratioBtn: byId("ratioBtn"),
  ratioMenu: byId("ratioMenu"),
  settingsBtn: byId("settingsBtn"),

  // Control bar
  captureBtn: byId("captureBtn"),
  switchCameraBtn: byId("switchCameraBtn"),
  lastPhotoBtn: byId("lastPhotoBtn"),
  lastPhotoImg: byId("lastPhotoImg"),

  // Startup / error state
  viewfinderState: byId("viewfinderState"),
  stateTitle: byId("stateTitle"),
  stateText: byId("stateText"),
  retryBtn: byId("retryBtn"),

  // Photo review
  review: byId("review"),
  reviewClose: byId("reviewClose"),
  reviewImage: byId("reviewImage"),
  shareBtn: byId("shareBtn"),
  saveBtn: byId("saveBtn"),

  // About modal
  aboutModal: byId("aboutModal"),
  closeModal: byId("closeModal"),

  // Camera settings sheet
  settingsScrim: byId("settingsScrim"),
  settingsPanel: byId("settingsPanel"),
  settingsClose: byId("settingsClose"),
  zoomGroup: byId("zoomGroup"),
  zoomSlider: byId("zoomSlider"),
  zoomValue: byId("zoomValue"),
  torchGroup: byId("torchGroup"),
  torchBtn: byId("torchBtn"),
  focusGroup: byId("focusGroup"),
  focusModes: byId("focusModes"),
  focusDistanceGroup: byId("focusDistanceGroup"),
  focusDistanceSlider: byId("focusDistanceSlider"),
  focusDistanceValue: byId("focusDistanceValue"),
  exposureGroup: byId("exposureGroup"),
  exposureModes: byId("exposureModes"),
  exposureCompGroup: byId("exposureCompGroup"),
  exposureCompSlider: byId("exposureCompSlider"),
  exposureCompValue: byId("exposureCompValue")
};

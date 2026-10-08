// ============================================================================
// Application State
// ============================================================================

export const state = {
  currentStream: null,
  availableCameras: [],
  currentCameraIndex: 0,
  app: null,
  sprite: null,
  texture: null,
  glitchFilter: null,
  resizeHandler: null,
  cameraCapabilities: null,
  // Last captured photo, kept for the review screen and the thumbnail.
  lastPhotoBlob: null,
  lastPhotoUrl: null
};

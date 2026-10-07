// ============================================================================
// Configuration
// ============================================================================

export const CONFIG = {
  FPS: 15,
  SCALE_FACTOR: 1,
  NOISE_AMOUNT: 0.22,
  PARAM_CHANGE_INTERVAL: 60,
  PIXEL_SORT: {
    MIN_THRESHOLD_RANGE: [0.1, 0.3],
    MAX_THRESHOLD_RANGE: [0.5, 1.0],
    SPREAD_RANGE: [15, 65]
  },
  DELAYS: {
    // Fallback wait used only when the browser doesn't support
    // HTMLVideoElement.requestVideoFrameCallback() (see waitForVideoFrame).
    STREAM_STABILITY_FALLBACK: 200,
    FLASH_DURATION: 100,
    STATUS_MESSAGE: 2000,
    ERROR_MESSAGE: 3000,
    // Some browsers (notably Safari and Firefox) start the download
    // asynchronously, so revoking the blob URL too early can break it.
    URL_REVOKE: 40000
  }
};

export const ERROR_MESSAGES = {
  NotAllowedError: "Camera permission denied",
  NotFoundError: "No camera found",
  NotReadableError: "Camera already in use",
  OverconstrainedError: "Requested camera not available"
};

export const STARTUP_ERROR_MESSAGES = {
  NotAllowedError: "Please allow camera access and refresh the page.",
  NotFoundError: "No camera found on your device.",
  NotReadableError: "Camera is already in use by another application."
};

// MeteringMode values from the MediaStream Image Capture spec.
export const FOCUS_MODE_ORDER = ["continuous", "single-shot", "manual"];
export const EXPOSURE_MODE_ORDER = ["continuous", "manual"];

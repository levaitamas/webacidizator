// ============================================================================
// Camera Management
// ============================================================================

import { DOM } from "./dom.js";
import { state } from "./state.js";

export const stopStream = () => {
  if (state.currentStream) {
    state.currentStream.getTracks().forEach(track => track.stop());
    state.currentStream = null;
  }
};

export const getCameraStream = async (deviceId = null) => {
  const constraints = {
    video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } },
    audio: false
  };
  return await navigator.mediaDevices.getUserMedia(constraints);
};

const getAvailableCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    return videoDevices.map((device, i) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${i + 1}`
    }));
  } catch (error) {
    console.error('Failed to enumerate cameras:', error);
    return [];
  }
};

export const checkMultipleCameras = async () => {
  try {
    state.availableCameras = await getAvailableCameras();

    if (state.currentStream) {
      const currentTrack = state.currentStream.getVideoTracks()[0];
      const currentSettings = currentTrack.getSettings();
      state.currentCameraIndex = state.availableCameras.findIndex(
        cam => cam.deviceId === currentSettings.deviceId
      );
      if (state.currentCameraIndex === -1) state.currentCameraIndex = 0;
    }

    DOM.switchCameraBtn.style.display = state.availableCameras.length > 1 ? 'flex' : 'none';
  } catch (error) {
    console.error("Failed to check cameras:", error);
    DOM.switchCameraBtn.style.display = 'none';
  }
};

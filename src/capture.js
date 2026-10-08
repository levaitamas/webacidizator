// ============================================================================
// Photo Capture, Review, Save and Share
// ============================================================================

import { CONFIG } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";
import { createDialog, setStatus } from "./utils.js";

const playFlashEffect = () => {
  DOM.flash.classList.add('active');
  setTimeout(() => DOM.flash.classList.remove('active'), CONFIG.DELAYS.FLASH_DURATION);
};

const photoFileName = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `webacidizator-${timestamp}.png`;
};

const photoFile = () =>
  new File([state.lastPhotoBlob], photoFileName(), { type: 'image/png' });

const canShare = () => {
  if (!state.lastPhotoBlob || typeof navigator.share !== 'function') return false;
  try {
    return navigator.canShare?.({ files: [photoFile()] }) === true;
  } catch {
    return false;
  }
};

// ----------------------------------------------------------------------------
// Review overlay
// ----------------------------------------------------------------------------

const reviewDialog = createDialog(DOM.review, {
  initialFocus: () => DOM.saveBtn,
  pauseKey: 'review',
  onOpen: () => {
    DOM.reviewImage.src = state.lastPhotoUrl;
    DOM.shareBtn.hidden = !canShare();
  }
});

export const isReviewOpen = reviewDialog.isOpen;

const openReview = () => {
  if (state.lastPhotoUrl) reviewDialog.open();
};

const closeReview = reviewDialog.close;

const setLastPhoto = (blob) => {
  if (state.lastPhotoUrl) URL.revokeObjectURL(state.lastPhotoUrl);
  state.lastPhotoBlob = blob;
  state.lastPhotoUrl = URL.createObjectURL(blob);
  DOM.lastPhotoImg.src = state.lastPhotoUrl;
  DOM.lastPhotoBtn.hidden = false;
};

// ----------------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------------

export const capturePhoto = () => {
  if (!state.app || !state.currentStream) return;
  try {
    playFlashEffect();

    // Without `preserveDrawingBuffer` the WebGL drawing buffer is cleared
    // right after presenting, so force a fresh render immediately before
    // reading pixels back via toBlob().
    state.app.renderer.render(state.app.stage);

    // The callback runs on a later task, outside the try below.
    state.app.canvas.toBlob((blob) => {
      try {
        if (!blob) {
          setStatus('Could not capture the frame', CONFIG.DELAYS.ERROR_MESSAGE, 'error');
          return;
        }
        setLastPhoto(blob);
        openReview();
      } catch (error) {
        console.error('Capture failed:', error);
        setStatus('Capture failed', CONFIG.DELAYS.ERROR_MESSAGE, 'error');
      }
    }, 'image/png');
  } catch (error) {
    console.error('Capture failed:', error);
    setStatus('Capture failed', CONFIG.DELAYS.ERROR_MESSAGE, 'error');
  }
};

const savePhoto = () => {
  if (!state.lastPhotoBlob) return;
  try {
    // A fresh object URL per download: some browsers (Safari, Firefox)
    // start the download asynchronously, so the shared preview URL must
    // not be revoked under it, and this one is revoked late.
    const url = URL.createObjectURL(state.lastPhotoBlob);
    const link = document.createElement('a');
    link.download = photoFileName();
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), CONFIG.DELAYS.URL_REVOKE);

    closeReview();
    setStatus('Photo saved', CONFIG.DELAYS.STATUS_MESSAGE, 'success');
  } catch (error) {
    console.error('Save failed:', error);
    setStatus('Could not save the photo', CONFIG.DELAYS.ERROR_MESSAGE, 'error');
  }
};

const sharePhoto = async () => {
  if (!canShare()) return;
  try {
    await navigator.share({ files: [photoFile()], title: 'WebAcidizator' });
    closeReview();
  } catch (error) {
    // The user dismissing the share sheet is not an error.
    if (error.name === 'AbortError') return;
    console.error('Share failed:', error);
    setStatus('Could not share the photo', CONFIG.DELAYS.ERROR_MESSAGE, 'error');
  }
};

export const setupCaptureListeners = () => {
  DOM.captureBtn.addEventListener('click', capturePhoto);
  DOM.lastPhotoBtn.addEventListener('click', openReview);
  DOM.reviewClose.addEventListener('click', closeReview);
  DOM.saveBtn.addEventListener('click', savePhoto);
  DOM.shareBtn.addEventListener('click', sharePhoto);
};

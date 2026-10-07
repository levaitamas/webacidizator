// ============================================================================
// Photo Capture
// ============================================================================

import { CONFIG } from "./config.js";
import { DOM } from "./dom.js";
import { state } from "./state.js";
import { setStatus } from "./utils.js";

const playFlashEffect = () => {
  DOM.flash.classList.add('active');
  setTimeout(() => DOM.flash.classList.remove('active'), CONFIG.DELAYS.FLASH_DURATION);
};

export const capturePhoto = () => {
  try {
    playFlashEffect();

    // Without `preserveDrawingBuffer` the WebGL drawing buffer is cleared
    // right after presenting, so force a fresh render immediately before
    // reading pixels back via toBlob().
    state.app.renderer.render(state.app.stage);

    state.app.canvas.toBlob((blob) => {
      try {
        if (!blob) {
          setStatus('❌ Failed to capture image');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

        link.download = `webacidizator-${timestamp}.png`;
        link.href = url;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), CONFIG.DELAYS.URL_REVOKE);
        setStatus('✅ Photo saved!', CONFIG.DELAYS.ERROR_MESSAGE);
      } catch (error) {
        console.error('Capture failed:', error);
        setStatus('❌ Capture failed', CONFIG.DELAYS.ERROR_MESSAGE);
      }
    }, 'image/png');
  } catch (error) {
    console.error('Capture failed:', error);
    setStatus('❌ Capture failed', CONFIG.DELAYS.ERROR_MESSAGE);
  }
};

// ============================================================================
// About Modal
// ============================================================================

import { DOM } from "./dom.js";
import { createDialog } from "./utils.js";

// The modal fully covers the canvas, so there's no point spending GPU
// time re-rendering the live glitch feed while it's hidden.
const aboutDialog = createDialog(DOM.aboutModal, {
  initialFocus: () => DOM.closeModal,
  pauseKey: 'modal'
});

// Close when clicking the backdrop
DOM.aboutModal.addEventListener('click', (e) => {
  if (e.target === DOM.aboutModal) aboutDialog.close();
});

DOM.closeModal.addEventListener('click', aboutDialog.close);
DOM.aboutBtn.addEventListener('click', aboutDialog.open);

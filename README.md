# WebAcidizator

A real-time webcam glitch art effect application with pixel sorting, color manipulation, and noise generation. Built with PixiJS v8. Available at [levaitamas.github.io/webacidizator](https://levaitamas.github.io/webacidizator).

## Story

We ([Kinga](@kingakov) and [Tamas](@levaitamas)) had a conceptual photo project between 2015 and 2017 that centered around a faulty camera (a Samsung NV8). The camera heavily distorted colors and forms, thus creating new context and meaning. Our goal was to present this world to others. Now, nearly a decade later, we have created a digital recreation of this camera for web browsers, allowing others to photograph this alternative world.

## How It Works

1. **Webcam Capture**: Requests browser webcam access once on load, preferring the world/rear-facing camera when available (falls back to any camera otherwise, so front-camera-only devices still work); lists available cameras via `enumerateDevices()` and shows a "Switch Camera" button when more than one is present, re-checked automatically whenever a camera is plugged or unplugged
2. **Camera Controls**: Exposes hardware controls the camera supports — zoom, torch (flash), focus mode/distance, and exposure mode/compensation — via the Camera Controls API; controls appear only when the device supports them
3. **PixiJS Rendering**: Video frames rendered to WebGL canvas at 15 FPS (with default settings)
4. **Glitch Filter** (a single custom shader pass):
   - Color stage (removes green channel)
   - Animated noise
   - Pixel sort (vertical luminance-based sorting)
5. **Dynamic Effects**: Parameters randomized every 60 frames for glitch aesthetic (with default settings)
6. **Photo Export**: Capture current frame as PNG with timestamped filename

## Project Structure

```
index.html          Entry point (markup only)
src/
  main.js           App initialization and entry point
  config.js         Constants and error messages
  shaders.js        GLSL shaders for the glitch filter
  dom.js            DOM element references
  state.js          Shared application state
  utils.js          Shared helpers (status, timing, throttling)
  modal.js          About modal behavior
  filters.js        PixiJS filter creation
  capture.js        Photo capture and download
  camera.js         Camera stream management
  camera-controls.js  Hardware camera controls (zoom, torch, focus, exposure)
  rendering.js      PixiJS rendering, textures, camera switching
  styles.css        All styles
scripts/
  check-app-js.mjs  Syntax-checks all src/*.js modules
  runtime-check.mjs Playwright smoke test (headless Chromium + fake camera)
```

No build step — the app runs as native ES modules in the browser and is deployed statically to GitHub Pages.

## Acknowledgments

- **PixiJS**: Powerful 2D WebGL rendering engine
- **Perplexity AI**: AI-powered research and development assistance
- **Claude Sonnet 4.5 and 5**: AI model for code generation and debugging
- **Qwen 3.8 27B (FP8)**: AI model for code generation and debugging
- **LongCat 2.5**: AI model for code generation and debugging
- Inspired by glitch art and pixel sorting techniques

## License

WebAcidizator is a free software and licensed under [GPLv3+](LICENSE).

# WebAcidizator

A real-time webcam glitch art effect application with pixel sorting, color manipulation, and noise generation. Built with PixiJS v8. Available at [levaitamas.github.io/webacidizator](https://levaitamas.github.io/webacidizator).

## Story

We ([Kinga](@kingakov) and [Tamas](@levaitamas)) had a conceptual photo project between 2015 and 2017 that centered around a faulty camera (a Samsung NV8). The camera heavily distorted colors and forms, thus creating new context and meaning. Our goal was to present this world to others. Now, nearly a decade later, we have created a digital recreation of this camera for web browsers, allowing others to photograph this alternative world.

## How It Works

1. **Webcam Capture**: Requests browser webcam access once on load, preferring the world/rear-facing camera when available (falls back to any camera otherwise, so front-camera-only devices still work); lists available cameras via `enumerateDevices()` and shows a switch-camera button when more than one is present, re-checked automatically whenever a camera is plugged or unplugged; if the active camera disconnects, falls back to another one. User-facing cameras (and desktop webcams) are mirrored like a selfie preview; what you see is what gets saved
2. **Frame Ratio**: The square 1:1 frame of the original Acidizator photos is the default; 4:3, 3:2 and 16:9 can be picked from the top bar and follow the camera's orientation (4:3 becomes 3:4 on a portrait phone). The choice is remembered in `localStorage`
3. **Camera Controls**: Exposes hardware controls the camera supports via the Camera Controls API — zoom on the viewfinder, plus torch (flash), focus mode/distance and exposure mode/compensation in a settings sheet; controls appear only when the device supports them
4. **PixiJS Rendering**: Video frames rendered to WebGL canvas at 15 FPS (with default settings)
5. **Glitch Filter** (a single custom shader pass):
   - Color stage (removes green channel)
   - Animated noise
   - Pixel sort (vertical luminance-based sorting)
6. **Dynamic Effects**: Parameters randomized every 60 frames for glitch aesthetic (with default settings)
7. **Photo Capture**: The shutter captures the current frame as PNG and opens a review screen with **Save** (download with a timestamped filename) and **Share** (Web Share API, on browsers that can share files); the last photo stays available as a thumbnail next to the shutter

The UI is laid out like a camera app: a viewfinder that fills the screen, a control bar at the bottom on portrait phones, and a rail on the right on landscape phones, tablets and desktops. The page never scrolls, and it can be installed to a phone's home screen (web manifest).

## Project Structure

```
index.html          Entry point (markup only)
favicon.svg         App icon
manifest.webmanifest  Web app manifest (standalone install)
src/
  main.js           App initialization and entry point
  config.js         Constants and error messages
  shaders.js        GLSL shaders for the glitch filter
  dom.js            DOM element references
  state.js          Shared application state
  utils.js          Shared helpers (state overlay, toast, render pausing, timing)
  modal.js          About modal behavior
  frame.js          Frame ratio picker and persistence
  filters.js        PixiJS filter creation
  capture.js        Photo capture, review screen, save and share
  camera.js         Camera stream management
  camera-controls.js  Hardware camera controls (zoom, torch, focus, exposure)
  rendering.js      PixiJS rendering, textures, camera switching
  styles.css        All styles
scripts/
  check-app-js.mjs  Syntax-checks all src/*.js modules
  runtime-check.mjs Playwright smoke test (headless Chromium + fake camera):
                    startup, capture/review, and layout at phone and desktop sizes
```

No build step — the app runs as native ES modules in the browser and is deployed statically to GitHub Pages.

## Acknowledgments

- **PixiJS**: Powerful 2D WebGL rendering engine
- **Perplexity AI**: AI-powered research and development assistance
- **Claude Sonnet 4.5 and 5, Claude Opus 5.5, Claude Fable 5.1**: AI models for code generation and debugging
- **Qwen 3.8 27B (FP8)**: AI model for code generation and debugging
- **LongCat 2.5**: AI model for code generation and debugging
- Inspired by glitch art and pixel sorting techniques

## License

WebAcidizator is a free software and licensed under [GPLv3+](LICENSE).

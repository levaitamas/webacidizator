# WebAcidizator

A real-time webcam glitch art effect application with pixel sorting, color manipulation, and noise generation. Built with PixiJS v8. Available at [levaitamas.github.io/webacidizator](https://levaitamas.github.io/webacidizator).

## Story

We ([Kinga](@kingakov) and [Tamas](@levaitamas)) had a conceptual photo project between 2015 and 2017 that centered around a faulty camera (a Samsung NV8). The camera heavily distorted colors and forms, thus creating new context and meaning. Our goal was to present this world to others. Now, nearly a decade later, we have created a digital recreation of this camera for web browsers, allowing others to photograph this alternative world.

## How It Works

1. **Webcam Capture**: Requests browser webcam access once on load; lists available cameras via `enumerateDevices()` and shows a "Switch Camera" button when more than one is present
2. **Camera Controls**: Exposes hardware controls the camera supports — zoom, torch (flash), focus mode/distance, and exposure mode/compensation — via the Camera Controls API; controls appear only when the device supports them
3. **PixiJS Rendering**: Video frames rendered to WebGL canvas at 15 FPS (with default settings)
4. **Filter Pipeline**:
   - Color matrix (removes green channel)
   - Animated noise filter
   - Custom pixel sort shader (vertical luminance-based sorting)
5. **Dynamic Effects**: Parameters randomized every 60 frames for glitch aesthetic (with default settings)
6. **Photo Export**: Capture current frame as PNG with timestamped filename

## Acknowledgments

- **PixiJS**: Powerful 2D WebGL rendering engine
- **Perplexity AI**: AI-powered research and development assistance
- **Claude Sonnet 4.5**: AI model for code generation and debugging
- **Qwen 3.8 27B (FP8)**: AI model for code generation and debugging
- Inspired by glitch art and pixel sorting techniques

## License

WebAcidizator is a free software and licensed under [GPLv3+](LICENSE).

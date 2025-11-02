# WebAcidizator

A real-time webcam glitch art effect application with pixel sorting, color manipulation, and noise generation. Built with PixiJS v8 and can be served via a lightweight Go web service with Prometheus metrics. Available at [levaitamas.github.io/webacidizator](https://levaitamas.github.io/webacidizator) too.

![PixiJS Version](https://img.shields.io/badge/pixijs-8.x-purple)
![Go Version](https://img.shields.io/badge/go-1.25-blue)

## How It Works

1. **Webcam Capture**: Requests browser webcam access (user-facing camera)
2. **PixiJS Rendering**: Video frames rendered to WebGL canvas at 15 FPS (with default settings)
3. **Filter Pipeline**:
   - Color matrix (removes green channel)
   - Animated noise filter
   - Custom pixel sort shader (vertical luminance-based sorting)
4. **Dynamic Effects**: Parameters randomized every 60 frames for glitch aesthetic (with default settings)
5. **Photo Export**: Capture current frame as PNG with timestamped filename

## Acknowledgments

- **PixiJS**: Powerful 2D WebGL rendering engine
- **Prometheus**: Industry-standard metrics and monitoring
- **Perplexity AI**: AI-powered research and development assistance
- **Claude Sonnet 4.5**: Advanced AI model for code generation and debugging
- Inspired by glitch art and pixel sorting techniques

## License

WebAcidizator is a free software and licensed under [GPLv3+](LICENSE).

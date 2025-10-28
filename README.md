# WebAcidizator

A real-time webcam glitch art effect application with pixel sorting, color manipulation, and noise generation. Built with PixiJS v8 and served via a lightweight Go web service with Prometheus metrics.

![Go Version](https://img.shields.io/badge/go-1.25-blue)
![PixiJS Version](https://img.shields.io/badge/pixijs-8.x-purple)

## ✨ Features

- **Real-time Webcam Effects**: Live webcam feed with GPU-accelerated glitch effects
- **Pixel Sorting**: Custom GLSL shader implementing vertical pixel sorting based on luminance
- **Dynamic Parameters**: Automatically randomized effect parameters for evolving visual aesthetics
- **Photo Capture**: Save snapshots of filtered webcam with timestamp
- **Color Matrix Filtering**: Removes green channel for cyan/magenta color scheme
- **Animated Noise**: Continuously animated grain/noise overlay
- **Prometheus Metrics**: Built-in HTTP metrics and custom application metrics
- **Kubernetes Ready**: Complete K8s manifests for production deployment
- **Lightweight**: Minimal Go backend (~10MB container) with embedded static files

## 🎬 How It Works

1. **Webcam Capture**: Requests browser webcam access (user-facing camera)
2. **PixiJS Rendering**: Video frames rendered to WebGL canvas at 15 FPS
3. **Filter Pipeline**:
   - Color matrix (removes green channel)
   - Animated noise filter
   - Custom pixel sort shader (vertical luminance-based sorting)
4. **Dynamic Effects**: Parameters randomized every 60 frames for glitch aesthetic
5. **Photo Export**: Capture current frame as PNG with timestamped filename

## 🙏 Acknowledgments

- **PixiJS**: Powerful 2D WebGL rendering engine
- **Prometheus**: Industry-standard metrics and monitoring
- **Perplexity AI**: AI-powered research and development assistance
- **Claude Sonnet 4.5**: Advanced AI model for code generation and debugging
- Inspired by glitch art and pixel sorting techniques

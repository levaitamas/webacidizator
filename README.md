# PixiJS Webcam Effects

A single-page demo that uses [PixiJS v8](https://pixijs.com/) to render your webcam feed with a custom filter stack. The first pass removes the green color channel via a `ColorMatrixFilter`, and the second pass injects animated RGB noise using `NoiseFilter`. The processed stream is displayed at the center of the viewport with a responsive layout.

## Features

- Green channel suppression using PixiJS `ColorMatrixFilter`
- Animated RGB grain with PixiJS `NoiseFilter`
- Responsive canvas that scales to common display sizes
- Graceful fallback messaging when camera access is unavailable

## Requirements

- A modern desktop or mobile browser that supports ES modules and `navigator.mediaDevices.getUserMedia`
- Access to a webcam (integrated or external)
- Serving the files over HTTPS or `http://localhost` (browsers block webcam access on insecure origins)

## Getting Started

1. Install a lightweight static server if you do not already have one. For example:
   ```bash
   npm install --global serve
   ```
2. From the project directory, start the server:
   ```bash
   serve .
   ```
3. Open the printed local URL (e.g., `http://localhost:3000`) in your browser.
4. Grant camera permission when prompted. The filtered feed should appear centered on the page.

## Customization Tips

- **Noise intensity**: Adjust the `noise` option when constructing the `NoiseFilter`.
- **Color mix**: Modify the 4×5 matrix assigned to the `ColorMatrixFilter` to experiment with other channel blends.
- **Canvas framing**: Tweak the `scaleFactor` inside `resizeSprite` to change how much padding surrounds the video.

## Troubleshooting

- **Permission denied**: Refresh the page and allow camera access. Some browsers require site settings to be reset manually.
- **Blank canvas**: Ensure you are serving over HTTPS or `localhost`. `file://` origins are blocked from webcam access in most browsers.
- **Distorted aspect ratio**: The canvas resizes dynamically, but if you alter layout styles, verify `sprite.width`/`height` calculations still respect the video aspect ratio.

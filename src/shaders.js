// ============================================================================
// GLSL Shaders
// ============================================================================

export const SHADERS = {
  vertex: `
precision highp float;

in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}`,

  fragment: `
precision highp float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform float uMinThreshold;
uniform float uMaxThreshold;
uniform float uSpread;
uniform float uNoise;
uniform float uSeed;

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Color stage: drop the green channel and add per-pixel noise, matching
// Pixi's ColorMatrixFilter + NoiseFilter run as separate passes
// (including the [0, 1] clamp of their intermediate textures). It is
// applied to every sample, so the sort sees the same processed image.
vec4 processedColor(vec2 uv) {
  vec4 color = texture(uTexture, uv);
  if (color.a > 0.0) {
    color.rgb /= color.a;
  }
  // The texel's gl_FragCoord, which seeds NoiseFilter's per-pixel noise.
  vec2 pixel = floor(uv * uInputSize.xy) + 0.5;
  float diff = (rand(pixel * uSeed) - 0.5) * uNoise;
  color.rgb = clamp(vec3(color.r, 0.0, color.b) + diff, 0.0, 1.0);
  color.rgb *= color.a;
  return color;
}

void main(void) {
  vec2 uv = vTextureCoord;
  vec4 base = processedColor(uv);
  float baseLuma = luminance(base.rgb);

  if (baseLuma < uMinThreshold || baseLuma > uMaxThreshold) {
gl_FragColor = base;
return;
  }

  vec2 texelSize = vec2(1.0) / uInputSize.xy;
  float spreadClamped = clamp(uSpread, 1.0, 64.0);
  int steps = int(spreadClamped);

  vec4 brightest = base;
  float brightestLuma = baseLuma;
  vec4 darkest = base;
  float darkestLuma = baseLuma;

  for (int i = 1; i <= 64; i++) {
if (i > steps) break;

float offset = float(i) * texelSize.y;

vec2 downUv = uv + vec2(0.0, offset);
if (downUv.y <= 1.0) {
  vec4 sample = processedColor(downUv);
  float luma = luminance(sample.rgb);
  if (luma >= uMinThreshold && luma <= uMaxThreshold && luma > brightestLuma) {
    brightest = sample;
    brightestLuma = luma;
  }
}

vec2 upUv = uv - vec2(0.0, offset);
if (upUv.y >= 0.0) {
  vec4 sample = processedColor(upUv);
  float luma = luminance(sample.rgb);
  if (luma >= uMinThreshold && luma <= uMaxThreshold && luma < darkestLuma) {
    darkest = sample;
    darkestLuma = luma;
  }
}
  }

  float mixFactor = smoothstep(uMinThreshold, uMaxThreshold, baseLuma);
  gl_FragColor = mix(darkest, brightest, mixFactor);
}`
};

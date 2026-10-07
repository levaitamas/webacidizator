// ============================================================================
// Filter Creation
// ============================================================================

import {
  Filter,
  GlProgram
} from "https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs";

import { CONFIG } from "./config.js";
import { SHADERS } from "./shaders.js";
import { randomInRange } from "./utils.js";

// Single-pass glitch filter: drops the green channel, adds animated
// noise, and pixel-sorts the result (see SHADERS.fragment). Doing it in
// one pass avoids two full-screen render-to-texture round trips.
export const createGlitchFilter = () => {
  return new Filter({
    glProgram: new GlProgram({
      fragment: SHADERS.fragment,
      vertex: SHADERS.vertex,
    }),
    resources: {
      pixelSortUniforms: {
        uMinThreshold: { value: 0.2, type: 'f32' },
        uMaxThreshold: { value: 0.7, type: 'f32' },
        uSpread: { value: 30.0, type: 'f32' },
        uNoise: { value: CONFIG.NOISE_AMOUNT, type: 'f32' },
        uSeed: { value: Math.random(), type: 'f32' },
      }
    },
  });
};

export const randomizeNoiseSeed = (filter) => {
  const uniforms = filter?.resources?.pixelSortUniforms?.uniforms;
  if (uniforms) uniforms.uSeed = Math.random();
};

export const randomizePixelSortParams = (filter) => {
  // Pixi v8 filters have no `uniforms` shortcut; the values live on the
  // uniform group passed in `resources`.
  const uniforms = filter?.resources?.pixelSortUniforms?.uniforms;
  if (!uniforms) return;

  const { MIN_THRESHOLD_RANGE, MAX_THRESHOLD_RANGE, SPREAD_RANGE } = CONFIG.PIXEL_SORT;
  uniforms.uMinThreshold = randomInRange(...MIN_THRESHOLD_RANGE);
  uniforms.uMaxThreshold = randomInRange(...MAX_THRESHOLD_RANGE);
  uniforms.uSpread = randomInRange(...SPREAD_RANGE);
};

// ============================================================================
// Filter Creation
// ============================================================================

import {
  ColorMatrixFilter,
  Filter,
  GlProgram
} from "https://cdn.jsdelivr.net/npm/pixi.js@8.22.0/dist/pixi.min.mjs";

import { CONFIG } from "./config.js";
import { SHADERS } from "./shaders.js";
import { randomInRange } from "./utils.js";

export const createColorMatrix = () => {
  const filter = new ColorMatrixFilter();
  filter.matrix = [
    1, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0
  ];
  return filter;
};

export const createPixelSortFilter = () => {
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
      }
    },
  });
};

export const randomizePixelSortParams = (filter) => {
  if (!filter?.uniforms) return;

  const { MIN_THRESHOLD_RANGE, MAX_THRESHOLD_RANGE, SPREAD_RANGE } = CONFIG.PIXEL_SORT;
  filter.uniforms.uMinThreshold = randomInRange(...MIN_THRESHOLD_RANGE);
  filter.uniforms.uMaxThreshold = randomInRange(...MAX_THRESHOLD_RANGE);
  filter.uniforms.uSpread = randomInRange(...SPREAD_RANGE);
};

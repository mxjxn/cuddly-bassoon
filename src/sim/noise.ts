/** Deterministic value noise keyed by a string seed. Does not mutate SeededRandom. */

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hash2(x: number, y: number, seed: number): number {
  let h = seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth value noise in [0, 1]. */
export function valueNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = fade(xf);
  const v = fade(yf);

  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);

  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export interface NoiseField {
  sample(x: number, y: number): number;
}

/** Multi-octave fractal Brownian motion. Returns [0, 1]. */
export function createFbm(
  seedKey: string,
  octaves: number = 4,
  lacuna: number = 2,
  gain: number = 0.5,
  scale: number = 1
): NoiseField {
  const base = hashString(seedKey);
  return {
    sample(x: number, y: number): number {
      let amp = 1;
      let freq = scale;
      let sum = 0;
      let norm = 0;
      for (let i = 0; i < octaves; i++) {
        const s = (base + i * 1013) >>> 0;
        sum += valueNoise2D(x * freq, y * freq, s) * amp;
        norm += amp;
        amp *= gain;
        freq *= lacuna;
      }
      return sum / norm;
    }
  };
}

/** Domain-warped fBm for more organic patches. */
export function createWarpedFbm(
  seedKey: string,
  octaves: number = 4,
  scale: number = 0.08,
  warpStrength: number = 4
): NoiseField {
  const base = createFbm(seedKey, octaves, 2, 0.5, scale);
  const warpX = createFbm(seedKey + '-wx', 3, 2, 0.5, scale * 0.6);
  const warpY = createFbm(seedKey + '-wy', 3, 2, 0.5, scale * 0.6);
  return {
    sample(x: number, y: number): number {
      const wx = (warpX.sample(x, y) - 0.5) * warpStrength;
      const wy = (warpY.sample(x, y) - 0.5) * warpStrength;
      return base.sample(x + wx, y + wy);
    }
  };
}

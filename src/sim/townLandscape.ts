import { SeededRandom } from './random';
import { createFbm, createWarpedFbm, type NoiseField } from './noise';
import { ANSI_COLORS } from '../render/ansiColors';
import type {
  Site,
  World,
  Building,
  Position,
  LandscapeTile,
  GroundKind,
  LandscapeAnim,
  BiomeType,
  SiteType
} from './types';

interface Style {
  char: string;
  fg: string;
  bg: string;
  anim?: LandscapeAnim;
  animChar?: string;
  animFg?: string;
}

interface WorldCtx {
  baseHeight: number;
  biome: BiomeType;
  nearWater: boolean;
  nearCoast: boolean;
  nearMountain: boolean;
  nearForest: boolean;
}

const TREE_GLYPHS = ['♣', '♠', '↑', 'Γ', 'τ'] as const;
const SHRUB_GLYPHS = ['‡', '†', 'º', '*'] as const;
const FLOWER_GLYPHS = ['*', '°'] as const;
const FLOWER_COLORS = [
  ANSI_COLORS.brightRed,
  ANSI_COLORS.brightYellow,
  ANSI_COLORS.brightMagenta,
  ANSI_COLORS.brightCyan
] as const;
const REED_GLYPHS = ['⌠', '|', '¡'] as const;

function sampleWorldContext(world: World, site: Site): WorldCtx {
  const t = world.terrain[site.y]?.[site.x];
  const baseHeight = t?.height ?? 0.45;
  const biome = t?.biome ?? 'plains';

  let nearWater = biome === 'water' || biome === 'coast';
  let nearCoast = biome === 'coast';
  let nearMountain = biome === 'mountains' || biome === 'hills';
  let nearForest = biome === 'forest';

  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const cell = world.terrain[site.y + dy]?.[site.x + dx];
      if (!cell) continue;
      if (cell.biome === 'water') nearWater = true;
      if (cell.biome === 'coast') nearCoast = true;
      if (cell.biome === 'mountains' || cell.biome === 'hills') nearMountain = true;
      if (cell.biome === 'forest') nearForest = true;
    }
  }

  return { baseHeight, biome, nearWater, nearCoast, nearMountain, nearForest };
}

function pick<T>(arr: readonly T[], n: number): T {
  const i = Math.abs(Math.floor(n * 9973)) % arr.length;
  return arr[i];
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function blendHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 * (1 - t) + r2 * t);
  const g = Math.round(g1 * (1 - t) + g2 * t);
  const bl = Math.round(b1 * (1 - t) + b2 * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

/** Painterly meadow: readable ground tint, sparse accents (not a black void). */
function styleMeadow(fertility: number, accent: number, rng: SeededRandom): Style {
  const bg = fertility > 0.55 ? '#0d1a0a' : fertility > 0.35 ? '#0a140c' : '#0c120e';
  if (accent > 0.88) {
    return {
      char: pick(FLOWER_GLYPHS, rng.next()),
      fg: pick(FLOWER_COLORS, rng.next()),
      bg,
      anim: 'flower',
      animChar: '*',
      animFg: ANSI_COLORS.brightYellow
    };
  }
  if (accent > 0.48) {
    return {
      char: pick(["'", ',', '`', '.', '"'] as const, rng.next()),
      fg: fertility > 0.5 ? ANSI_COLORS.green : ANSI_COLORS.brightBlack,
      bg,
      anim: accent > 0.7 ? 'grass' : undefined,
      animChar: pick(["'", ',', '.'] as const, rng.next() + 0.3),
      animFg: ANSI_COLORS.green
    };
  }
  // Quiet floor — still a visible glyph so the canvas never reads as empty void
  return {
    char: pick(['.', '`', '.', ' ', ','] as const, rng.next() + fertility),
    fg: '#2a3a28',
    bg
  };
}

function styleWater(depth: number, shoreDist: number, ripple: number, rng: SeededRandom): Style {
  // Soften banding: mix depth with ripple noise so shallows/deep interleave
  const d = clamp01(depth * 0.65 + ripple * 0.35);

  if (shoreDist < 2.2 && d < 0.4) {
    if (ripple > 0.55) {
      return {
        char: pick(REED_GLYPHS, rng.next()),
        fg: ANSI_COLORS.brightGreen,
        bg: blendHex('#003355', '#1a3010', 0.55),
        anim: 'reed',
        animChar: '¡',
        animFg: ANSI_COLORS.green
      };
    }
    return {
      char: pick(['.', '~', '`', ':'] as const, rng.next()),
      fg: ANSI_COLORS.brightYellow,
      bg: ripple > 0.35 ? '#2a2810' : '#3a3010'
    };
  }

  // Sparse ripples — most tiles are quiet color so water isn't a uniform ~ grid
  const showRipple = ripple > 0.55 || rng.next() > 0.62;
  const g = showRipple ? pick(['≈', '~', '≈', '.'] as const, ripple) : ' ';

  if (d < 0.38) {
    return {
      char: g,
      fg: ripple > 0.5 ? ANSI_COLORS.brightCyan : ANSI_COLORS.cyan,
      bg: blendHex('#003a55', '#004466', ripple),
      anim: showRipple ? 'water' : undefined,
      animChar: '~',
      animFg: ANSI_COLORS.brightCyan
    };
  }
  if (d < 0.7) {
    return {
      char: g,
      fg: ripple > 0.6 ? ANSI_COLORS.cyan : ANSI_COLORS.brightBlue,
      bg: blendHex('#001a66', ANSI_COLORS.blue, d),
      anim: showRipple ? 'water' : undefined,
      animChar: '≈',
      animFg: ANSI_COLORS.cyan
    };
  }
  return {
    char: showRipple && ripple > 0.65 ? '≈' : ' ',
    fg: ANSI_COLORS.blue,
    bg: blendHex('#000055', '#000033', ripple * 0.4),
    anim: showRipple ? 'water' : undefined,
    animChar: '~',
    animFg: ANSI_COLORS.brightBlue
  };
}

function styleSlope(
  elev: number,
  aspectX: number,
  aspectY: number,
  rng: SeededRandom
): Style {
  // Light from upper-left — color shift, NOT vertical ░/▓ columns
  const light = clamp01(0.5 + (-aspectX * 0.8 + aspectY * 0.5) * 0.5);
  const lit = light > 0.52;
  const bg = elev > 0.85 ? '#222228' : elev > 0.7 ? '#141418' : '#101210';

  if (elev > 0.9) {
    return {
      char: pick(['▲', '▲', '^'] as const, rng.next()),
      fg: lit ? ANSI_COLORS.brightWhite : ANSI_COLORS.white,
      bg: '#2a2a33'
    };
  }
  if (elev > 0.8) {
    return {
      char: pick(['▲', '^', '∩', '^'] as const, rng.next()),
      fg: lit ? ANSI_COLORS.brightWhite : ANSI_COLORS.white,
      bg
    };
  }
  if (elev > 0.68) {
    // Mid slopes: ridgeline glyphs only — never ░▒▓ columns
    const glyph = lit
      ? pick(['∩', 'n', '^', '.', '∩'] as const, rng.next() + light)
      : pick(['n', '^', '∩', 'o', '`'] as const, rng.next() + elev);
    return {
      char: glyph,
      fg: lit ? ANSI_COLORS.white : ANSI_COLORS.brightBlack,
      bg
    };
  }
  // Foothills — scrub + boulders, open ground between
  if (rng.next() > 0.55) {
    return {
      char: pick(['∩', 'n', 'o', '.', '`'] as const, rng.next()),
      fg: lit ? ANSI_COLORS.white : ANSI_COLORS.brightBlack,
      bg: '#0e100e'
    };
  }
  return {
    char: pick(['.', '`', ',', 'n'] as const, rng.next()),
    fg: ANSI_COLORS.brightBlack,
    bg: '#0c100c'
  };
}

function styleForest(dense: boolean, edge: boolean, rng: SeededRandom, failed: boolean): Style {
  if (dense && !edge) {
    return {
      char: pick(TREE_GLYPHS, rng.next()),
      fg: failed ? ANSI_COLORS.green : ANSI_COLORS.brightGreen,
      bg: '#001800',
      anim: 'tree',
      animChar: pick(TREE_GLYPHS, rng.next() + 0.4),
      animFg: ANSI_COLORS.green
    };
  }
  if (edge) {
    // fade: sometimes shrub, sometimes empty meadow tint
    if (rng.next() > 0.55) {
      return {
        char: pick(SHRUB_GLYPHS, rng.next()),
        fg: ANSI_COLORS.green,
        bg: '#0a1008'
      };
    }
    return styleMeadow(0.45, rng.next() * 0.5, rng);
  }
  return {
    char: pick(TREE_GLYPHS, rng.next()),
    fg: ANSI_COLORS.green,
    bg: '#001400',
    anim: 'tree',
    animChar: '♠',
    animFg: ANSI_COLORS.brightGreen
  };
}

function applyTile(tile: LandscapeTile, style: Style, ground: GroundKind): LandscapeTile {
  return {
    ...tile,
    ground,
    char: style.char,
    fg: style.fg,
    bg: style.bg,
    anim: style.anim,
    animChar: style.animChar,
    animFg: style.animFg
  };
}

/**
 * Build a soft water mask: irregular shoreline via noise, depth from distance field.
 * Returns depth in [0,1] or -1 if land.
 */
function buildWaterField(
  width: number,
  height: number,
  ctx: WorldCtx,
  siteType: SiteType,
  shoreNoise: NoiseField,
  islandNoise: NoiseField
): Float32Array {
  const field = new Float32Array(width * height);
  field.fill(-1);

  // Only true coastal/harbor sites get a sea body — not every site near a distant lake
  const wantsCoast =
    siteType === 'freeport' ||
    ctx.biome === 'coast' ||
    ctx.biome === 'water' ||
    (ctx.nearCoast && siteType !== 'company-town' && ctx.biome !== 'mountains' && ctx.biome !== 'hills');

  if (siteType === 'company-town' && !wantsCoast) {
    return field; // cleared / inland industrial — no ocean slab
  }

  // Irregular coastline — large noise amplitude so it isn't a flat band
  const coastY0 = siteType === 'freeport' || wantsCoast
    ? height * 0.58
    : height * 0.72;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = shoreNoise.sample(x, y);
      const n2 = shoreNoise.sample(x * 0.4 + 9, y * 0.4);
      const wave =
        (n - 0.5) * 22 +
        (n2 - 0.5) * 12 +
        Math.sin(x * 0.09 + n * 4) * 4 +
        Math.cos(x * 0.17) * 2.5;
      const coastLine = coastY0 + wave;

      if (wantsCoast && y > coastLine) {
        const dist = (y - coastLine) / Math.max(1, height - coastLine);
        // Break horizontal depth bands with lateral noise
        let depth = clamp01(dist * 0.7 + n * 0.35 + (n2 - 0.5) * 0.25);

        const isl = islandNoise.sample(x * 1.4, y * 1.4);
        if (isl > 0.7 && depth < 0.6) {
          field[y * width + x] = -1;
          continue;
        }
        if (isl > 0.58 && depth < 0.45) {
          depth = Math.min(depth, 0.18);
        }
        // Occasional deep pockets near shore / shallow fingers into deep
        if (n2 > 0.7 && dist > 0.3) depth = Math.min(1, depth + 0.25);
        if (n < 0.35 && dist < 0.55) depth = Math.min(depth, 0.35);

        field[y * width + x] = depth;
      }
    }
  }

  return field;
}

function buildElevationField(
  width: number,
  height: number,
  ctx: WorldCtx,
  elevNoise: NoiseField,
  ridgeNoise: NoiseField
): { elev: Float32Array; ax: Float32Array; ay: Float32Array } {
  const elev = new Float32Array(width * height);
  const ax = new Float32Array(width * height);
  const ay = new Float32Array(width * height);

  const mountainous = ctx.biome === 'mountains' || ctx.biome === 'hills' || ctx.nearMountain;
  const bias = (ctx.baseHeight - 0.4) * 0.45;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let e = elevNoise.sample(x, y) * 0.75 + bias + 0.2;

      if (mountainous) {
        // Diagonal / blotchy ridgelines — avoid vertical stripe fields
        const ridge = ridgeNoise.sample(x, y);
        const ridge2 = ridgeNoise.sample(x * 0.55 + 20, y * 0.55);
        const ridge3 = ridgeNoise.sample(y * 0.4, x * 0.4); // swapped axes break columns
        const ny = y / height;
        // Blotchy highlands from noise only — avoid axis-aligned walls
        const highland =
          (ridge - 0.4) * 0.7 +
          (ridge2 - 0.5) * 0.4 +
          (ridge3 - 0.5) * 0.35 +
          (1 - ny) * 0.12;
        e = clamp01(e * 0.5 + highland);
        // Carve valleys / passes for breathing room and irregular edges
        if (ridge2 < 0.4) e *= 0.5;
        if (ridge3 > 0.65 && ridge < 0.5) e *= 0.6;
      } else {
        // Occasional rocky knolls
        const knoll = ridgeNoise.sample(x, y);
        if (knoll > 0.78) e = clamp01(e + (knoll - 0.78) * 1.5);
      }

      elev[y * width + x] = clamp01(e);
    }
  }

  // Aspect from finite differences
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const l = elev[y * width + Math.max(0, x - 1)];
      const r = elev[y * width + Math.min(width - 1, x + 1)];
      const u = elev[Math.max(0, y - 1) * width + x];
      const d = elev[Math.min(height - 1, y + 1) * width + x];
      ax[i] = r - l;
      ay[i] = d - u;
    }
  }

  return { elev, ax, ay };
}

function groveStrength(
  x: number,
  y: number,
  cluster: NoiseField,
  detail: NoiseField
): number {
  const c = cluster.sample(x, y);
  const d = detail.sample(x * 0.4, y * 0.4);
  // Softer, smaller patches — fade edges for breathing room
  const core = (c - 0.58) / 0.32;
  if (core <= 0) return Math.max(0, (c - 0.48) * 0.25 - d * 0.15);
  return clamp01(core * (0.85 - d * 0.35));
}

export function generateLandscape(
  site: Site,
  world: World,
  width: number,
  height: number,
  buildings: Building[],
  streets: Position[]
): LandscapeTile[][] {
  const rng = new SeededRandom(`${world.seed}-landscape-${site.id}`);
  const ctx = sampleWorldContext(world, site);

  const elevNoise = createWarpedFbm(`${world.seed}-elev-${site.id}`, 5, 0.045, 6);
  const ridgeNoise = createWarpedFbm(`${world.seed}-ridge-${site.id}`, 4, 0.035, 5);
  const moistNoise = createWarpedFbm(`${world.seed}-moist-${site.id}`, 4, 0.07, 4);
  const fertNoise = createFbm(`${world.seed}-fert-${site.id}`, 3, 2, 0.5, 0.06);
  const vegNoise = createWarpedFbm(`${world.seed}-veg-${site.id}`, 4, 0.09, 4);
  const clusterNoise = createFbm(`${world.seed}-cluster-${site.id}`, 3, 2, 0.55, 0.035);
  const clusterDetail = createFbm(`${world.seed}-cdet-${site.id}`, 2, 2, 0.5, 0.12);
  const shoreNoise = createWarpedFbm(`${world.seed}-shore-${site.id}`, 4, 0.05, 5);
  const islandNoise = createFbm(`${world.seed}-island-${site.id}`, 3, 2, 0.5, 0.12);
  const accentNoise = createFbm(`${world.seed}-accent-${site.id}`, 2, 2, 0.5, 0.2);

  const waterField = buildWaterField(width, height, ctx, site.type, shoreNoise, islandNoise);
  const { elev, ax, ay } = buildElevationField(width, height, ctx, elevNoise, ridgeNoise);

  const moistBias =
    ctx.nearWater || ctx.nearCoast ? 0.15 :
    ctx.biome === 'forest' ? 0.08 :
    ctx.biome === 'mountains' ? -0.08 : 0;

  const grid: LandscapeTile[][] = [];
  const failed = site.type === 'failed-charter';

  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const e = elev[i];
      const moisture = clamp01(moistNoise.sample(x, y) * 0.8 + moistBias + 0.1);
      const fertility = clamp01(fertNoise.sample(x, y) * (1 - e * 0.35) + moisture * 0.12);
      const grove = groveStrength(x, y, clusterNoise, clusterDetail);
      const veg = vegNoise.sample(x, y) * (0.35 + grove * 0.9);
      const accent = accentNoise.sample(x, y);

      const base: LandscapeTile = {
        elevation: e,
        moisture,
        fertility,
        ground: 'meadow',
        char: ' ',
        fg: ANSI_COLORS.brightBlack,
        bg: '#080c08'
      };

      const wDepth = waterField[i];
      if (wDepth >= 0) {
        if (e > 0.72) {
          grid[y][x] = applyTile(base, styleSlope(e, ax[i], ay[i], rng), e > 0.85 ? 'peak' : 'rock');
          continue;
        }
        const shoreDist = estimateShoreDist(waterField, width, height, x, y);
        const ripple = accentNoise.sample(x * 1.3, y * 1.3);
        if (wDepth < 0.22 && shoreDist < 2.2) {
          grid[y][x] = applyTile(base, styleWater(wDepth, shoreDist, ripple, rng), 'sand');
        } else if (shoreDist < 2.4 && wDepth < 0.42 && ripple > 0.45) {
          grid[y][x] = applyTile(base, {
            char: pick(REED_GLYPHS, rng.next()),
            fg: ANSI_COLORS.brightGreen,
            bg: blendHex(ANSI_COLORS.blue, '#1a3010', 0.45),
            anim: 'reed',
            animChar: '¡',
            animFg: ANSI_COLORS.green
          }, 'marsh');
        } else {
          grid[y][x] = applyTile(base, styleWater(wDepth, shoreDist, ripple, rng), 'pond');
        }
        continue;
      }

      // Mountains / slopes
      if (e > 0.62 && (ctx.biome === 'mountains' || ctx.biome === 'hills' || ctx.nearMountain || e > 0.78)) {
        const g: GroundKind = e > 0.88 ? 'peak' : e > 0.75 ? 'cliff' : 'rock';
        grid[y][x] = applyTile(base, styleSlope(e, ax[i], ay[i], rng), g);
        // foothill scrub
        if (e < 0.7 && accent > 0.6) {
          grid[y][x] = applyTile(base, {
            char: pick(SHRUB_GLYPHS, rng.next()),
            fg: ANSI_COLORS.yellow,
            bg: '#101008'
          }, 'scrub');
        }
        continue;
      }

      // Site-type + vegetation with breathing room
      let ground: GroundKind = 'meadow';
      let style: Style = styleMeadow(fertility, accent, rng);

      if (site.type === 'company-town') {
        if (grove > 0.55 && veg > 0.45) {
          ground = 'stump';
          style = { char: pick(['τ', '¥'] as const, rng.next()), fg: ANSI_COLORS.yellow, bg: '#12100a' };
        } else if (grove > 0.25 || accent > 0.5) {
          ground = 'spoil';
          style = {
            char: pick(['.', ':', '`', ','] as const, rng.next()),
            fg: ANSI_COLORS.brightBlack,
            bg: '#14110c'
          };
        } else {
          ground = 'bare';
          style = { char: pick([' ', '.', '`'] as const, rng.next()), fg: ANSI_COLORS.brightBlack, bg: '#0c0c0c' };
        }
      } else if (grove > 0.62) {
        ground = 'forest';
        style = styleForest(true, false, rng, failed);
      } else if (grove > 0.36) {
        ground = 'forest-edge';
        style = styleForest(false, true, rng, failed);
      } else if (site.type === 'commons' && fertility > 0.62 && accent > 0.7 && grove < 0.2) {
        // gardens only as sparse accents — plots added in flavor pass
        ground = 'meadow';
        style = styleMeadow(fertility, accent, rng);
      } else if (moisture > 0.72 && e < 0.45 && accent > 0.5) {
        ground = 'marsh';
        style = {
          char: pick(REED_GLYPHS, rng.next()),
          fg: ANSI_COLORS.green,
          bg: blendHex(ANSI_COLORS.blue, '#1a3010', 0.55),
          anim: 'reed',
          animChar: '|',
          animFg: ANSI_COLORS.brightGreen
        };
      } else if (ctx.nearForest && grove > 0.2) {
        ground = 'forest-edge';
        style = styleForest(false, true, rng, failed);
      } else {
        ground = 'meadow';
        style = styleMeadow(fertility, accent * (site.type === 'failed-charter' ? 1.1 : 0.85), rng);
      }

      grid[y][x] = applyTile(base, style, ground);
    }
  }

  carveMeanderingStream(grid, width, height, waterField, rng, site.type, elev);
  applySiteFlavor(grid, width, height, site.type, rng, ctx);
  applySettledGround(grid, buildings, streets, site.type, rng);

  return grid;
}

function estimateShoreDist(
  water: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  let min = 99;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (water[ny * width + nx] < 0) {
        const d = Math.hypot(dx, dy);
        if (d < min) min = d;
      }
    }
  }
  return min;
}

function carveMeanderingStream(
  grid: LandscapeTile[][],
  width: number,
  height: number,
  waterField: Float32Array,
  rng: SeededRandom,
  siteType: SiteType,
  elev: Float32Array
): void {
  if (siteType === 'company-town') return;
  if (rng.next() > 0.85 && siteType !== 'commons' && siteType !== 'freeport') return;

  // Start from a high-ish point or northern area, meander toward water or south
  let x = rng.nextInt(Math.floor(width * 0.25), Math.floor(width * 0.75));
  let y = rng.nextInt(2, Math.floor(height * 0.25));
  const targetY = Math.floor(height * 0.7);
  let pondPlaced = false;

  for (let step = 0; step < height * 2 && y < height - 2; step++) {
    // Find southward preference with noise wobble
    const prefer =
      elev[y * width + Math.min(width - 1, x + 1)] < elev[y * width + Math.max(0, x - 1)] ? 1 : -1;
    x = Math.max(2, Math.min(width - 3, x + rng.nextInt(-1, 1) + (rng.next() > 0.6 ? prefer : 0)));
    y += rng.next() > 0.25 ? 1 : 0;
    if (y >= targetY && waterField[Math.min(height - 1, y) * width + x] >= 0) break;

    for (let w = -1; w <= 1; w++) {
      const sx = x + w;
      const sy = y;
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
      const t = grid[sy][sx];
      if (t.ground === 'peak' || t.ground === 'cliff') continue;
      const ripple = rng.next();
      const style = styleWater(0.35 + Math.abs(w) * 0.1, 1, ripple, rng);
      grid[sy][sx] = applyTile(
        { ...t, moisture: 0.85 },
        {
          ...style,
          bg: w === 0 ? style.bg : '#003355',
          fg: ANSI_COLORS.cyan
        },
        'stream'
      );
    }

    // Occasional pond bulge mid-course
    if (!pondPlaced && y > height * 0.35 && rng.next() > 0.92) {
      pondPlaced = true;
      placePond(grid, width, height, x, y, rng, 3 + rng.nextInt(0, 2));
    }
  }

  if (!pondPlaced) {
    placePond(grid, width, height, x, Math.min(height - 4, y), rng, 3);
  }
}

function placePond(
  grid: LandscapeTile[][],
  width: number,
  height: number,
  cx: number,
  cy: number,
  rng: SeededRandom,
  radius: number
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius - 1; dx <= radius + 1; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy * 1.3);
      if (dist > radius + rng.next() * 0.8) continue;
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
      const depth = clamp01(1 - dist / (radius + 0.5));
      const shoreDist = radius - dist;
      const t = grid[ty][tx];
      if (t.ground === 'peak') continue;
      grid[ty][tx] = applyTile(
        { ...t, moisture: 0.9 },
        styleWater(depth, shoreDist, rng.next(), rng),
        depth < 0.3 ? 'marsh' : 'pond'
      );
    }
  }
}

function applySiteFlavor(
  grid: LandscapeTile[][],
  width: number,
  height: number,
  siteType: SiteType,
  rng: SeededRandom,
  ctx: WorldCtx
): void {
  if (siteType === 'failed-charter') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = grid[y][x];
        if (t.ground === 'pond' || t.ground === 'stream' || t.ground === 'peak') continue;
        if (t.ground === 'meadow' && rng.next() > 0.78) {
          grid[y][x] = applyTile(t, styleForest(false, true, rng, true), 'forest-edge');
        } else if (t.ground === 'meadow' && rng.next() > 0.93) {
          const log = rng.next() > 0.5;
          grid[y][x] = {
            ...t,
            char: log ? '=' : '♠',
            fg: log ? ANSI_COLORS.yellow : ANSI_COLORS.brightMagenta,
            bg: '#0a1208',
            anim: undefined
          };
        }
      }
    }
  }

  if (siteType === 'company-town') {
    // Spoil heaps as irregular blobs near edges, not stripes
    for (let i = 0; i < 5; i++) {
      const cx = rng.nextInt(3, width - 4);
      const cy = rng.nextInt(3, height - 4);
      const nearEdge = Math.min(cx, cy, width - 1 - cx, height - 1 - cy) < 12;
      if (!nearEdge && rng.next() > 0.4) continue;
      const r = rng.nextInt(2, 5);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r + rng.next()) continue;
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
          const t = grid[ty][tx];
          if (t.ground === 'pond' || t.ground === 'peak') continue;
          grid[ty][tx] = applyTile(t, {
            char: pick(['.', ':', '`', ':'] as const, rng.next()),
            fg: ANSI_COLORS.yellow,
            bg: '#1a140c'
          }, 'spoil');
        }
      }
    }
  }

  if (siteType === 'commons') {
    // A few shared garden/orchard plots near center settlement — not whole map
    const plots = rng.nextInt(2, 4);
    const cx0 = Math.floor(width / 2);
    const cy0 = Math.floor(height / 2);
    for (let i = 0; i < plots; i++) {
      const px = cx0 + rng.nextInt(-18, 18);
      const py = cy0 + rng.nextInt(-12, 12);
      const pw = rng.nextInt(3, 6);
      const ph = rng.nextInt(3, 5);
      const orchard = rng.next() > 0.55;
      for (let dy = 0; dy < ph; dy++) {
        for (let dx = 0; dx < pw; dx++) {
          const tx = px + dx;
          const ty = py + dy;
          if (tx < 1 || ty < 1 || tx >= width - 1 || ty >= height - 1) continue;
          const t = grid[ty][tx];
          if (t.ground === 'pond' || t.ground === 'stream' || t.ground === 'peak') continue;
          if (orchard) {
            grid[ty][tx] = applyTile(t, {
              char: pick(['♣', '↑', 'τ'] as const, rng.next()),
              fg: ANSI_COLORS.brightGreen,
              bg: '#001a00',
              anim: 'tree',
              animChar: '♠',
              animFg: ANSI_COLORS.green
            }, 'orchard');
          } else {
            grid[ty][tx] = applyTile(t, {
              char: pick(['*', '°', '"', '≈'] as const, rng.next()),
              fg: pick(FLOWER_COLORS, rng.next()),
              bg: '#001800',
              anim: 'flower',
              animChar: '*',
              animFg: ANSI_COLORS.brightYellow
            }, 'garden');
          }
        }
      }
    }
  }

  if (siteType === 'guild-city') {
    const cx = width / 2;
    const cy = height / 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        const t = grid[y][x];
        if (dist < 16 && t.ground === 'meadow' && rng.next() > 0.82) {
          grid[y][x] = applyTile(t, {
            char: pick(["'", ',', '*'] as const, rng.next()),
            fg: ANSI_COLORS.brightGreen,
            bg: '#0a140a'
          }, 'garden');
        }
      }
    }
  }

  // Quiet wilderness boost for forest biomes away from settlement center
  if (ctx.nearForest || ctx.biome === 'forest') {
    const cx = width / 2;
    const cy = height / 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < 22) continue;
        const t = grid[y][x];
        if (t.ground === 'meadow' && rng.next() > 0.88) {
          grid[y][x] = applyTile(t, styleForest(false, true, rng, false), 'forest-edge');
        }
      }
    }
  }
}

function applySettledGround(
  grid: LandscapeTile[][],
  buildings: Building[],
  streets: Position[],
  _siteType: SiteType,
  rng: SeededRandom
): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  for (const s of streets) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const x = s.x + dx;
      const y = s.y + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const t = grid[y][x];
      if (t.ground === 'pond' || t.ground === 'stream' || t.ground === 'peak' || t.ground === 'cliff') continue;
      if (rng.next() > 0.4) {
        grid[y][x] = applyTile(t, {
          char: pick(['.', '`', ' '] as const, rng.next()),
          fg: ANSI_COLORS.brightBlack,
          bg: '#0a0a08'
        }, 'trampled');
      }
    }
  }

  for (const b of buildings) {
    // Tight clearing — keep meadow tint so settlement isn't a black rectangle
    for (let y = b.y - 2; y < b.y + b.height + 2; y++) {
      for (let x = b.x - 2; x < b.x + b.width + 2; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) continue;

        const t = grid[y][x];
        if (t.ground === 'pond' || t.ground === 'stream') continue;

        const dist = Math.min(
          Math.abs(x - b.x),
          Math.abs(x - (b.x + b.width - 1)),
          Math.abs(y - b.y),
          Math.abs(y - (b.y + b.height - 1))
        );

        if (dist <= 1) {
          grid[y][x] = applyTile(t, {
            char: pick(['·', '.', '`'] as const, rng.next()),
            fg: ANSI_COLORS.brightBlack,
            bg: '#10140e'
          }, 'trampled');
        } else if (
          (t.ground === 'forest' || t.ground === 'forest-edge' || t.ground === 'orchard') &&
          rng.next() > 0.4
        ) {
          grid[y][x] = applyTile(t, styleMeadow(t.fertility, 0.25, rng), 'meadow');
        }
      }
    }

    if (b.doorX !== undefined && b.doorY !== undefined) {
      const outX = b.doorX === b.x ? -1 : b.doorX === b.x + b.width - 1 ? 1 : 0;
      const outY = b.doorY === b.y ? -1 : b.doorY === b.y + b.height - 1 ? 1 : 0;
      for (let step = 1; step <= 5; step++) {
        const px = b.doorX + outX * step;
        const py = b.doorY + outY * step;
        if (px < 0 || py < 0 || px >= width || py >= height) break;
        const t = grid[py][px];
        if (t.ground === 'pond') break;
        grid[py][px] = applyTile(t, {
          char: '·',
          fg: ANSI_COLORS.yellow,
          bg: '#151208'
        }, 'path');
      }
    }
  }
}

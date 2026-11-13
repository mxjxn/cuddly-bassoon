import { SeededRandom } from './random';
import { createFbm, createWarpedFbm } from './noise';
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

const TREE_GLYPHS = ['♣', '♠', '↑', 'Γ', 'τ', '¥'] as const;
const SHRUB_GLYPHS = ['*', '‡', '†', 'º'] as const;
const GRASS_GLYPHS = ['"', "'", ',', '`', ';', '.'] as const;
const FLOWER_GLYPHS = ['*', '°', '☼', '∗'] as const;
const FLOWER_COLORS = [
  ANSI_COLORS.brightRed,
  ANSI_COLORS.brightYellow,
  ANSI_COLORS.brightMagenta,
  ANSI_COLORS.brightCyan,
  ANSI_COLORS.magenta,
  ANSI_COLORS.red
] as const;
const REED_GLYPHS = ['⌠', '|', '¡', '║'] as const;
const ROCK_GLYPHS = ['▲', '∩', '^', 'o', '○'] as const;
const WATER_GLYPHS = ['≈', '~', '≈'] as const;
const SLOPE_GLYPHS = ['░', '▒', '▓'] as const;

function sampleWorldContext(world: World, site: Site): {
  baseHeight: number;
  biome: BiomeType;
  nearWater: boolean;
  nearCoast: boolean;
  nearMountain: boolean;
  nearForest: boolean;
} {
  const t = world.terrain[site.y]?.[site.x];
  const baseHeight = t?.height ?? 0.45;
  const biome = t?.biome ?? 'plains';

  let nearWater = biome === 'water' || biome === 'coast';
  let nearCoast = biome === 'coast';
  let nearMountain = biome === 'mountains' || biome === 'hills';
  let nearForest = biome === 'forest';

  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
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
  return arr[Math.abs(Math.floor(n * arr.length)) % arr.length];
}

function styleFor(
  ground: GroundKind,
  elev: number,
  moisture: number,
  fertility: number,
  rng: SeededRandom,
  siteType: SiteType
): Style {
  switch (ground) {
    case 'pond':
    case 'stream':
      return {
        char: pick(WATER_GLYPHS, rng.next()),
        fg: moisture > 0.7 ? ANSI_COLORS.brightBlue : ANSI_COLORS.cyan,
        bg: ANSI_COLORS.blue,
        anim: 'water',
        animChar: ground === 'pond' ? '~' : '≈',
        animFg: ANSI_COLORS.brightCyan
      };
    case 'marsh':
      return {
        char: pick(REED_GLYPHS, rng.next()),
        fg: rng.next() > 0.5 ? ANSI_COLORS.green : ANSI_COLORS.brightGreen,
        bg: blendDark(ANSI_COLORS.blue, ANSI_COLORS.green, 0.55),
        anim: 'reed',
        animChar: pick(REED_GLYPHS, rng.next() + 0.3),
        animFg: ANSI_COLORS.brightGreen
      };
    case 'sand':
      return {
        char: rng.next() > 0.7 ? '~' : '.',
        fg: ANSI_COLORS.brightYellow,
        bg: ANSI_COLORS.yellow
      };
    case 'peak':
      return {
        char: '▲',
        fg: ANSI_COLORS.brightWhite,
        bg: '#222222'
      };
    case 'cliff':
      return {
        char: pick(SLOPE_GLYPHS, elev),
        fg: ANSI_COLORS.white,
        bg: '#1a1a1a'
      };
    case 'rock':
      return {
        char: pick(ROCK_GLYPHS, rng.next()),
        fg: elev > 0.75 ? ANSI_COLORS.white : ANSI_COLORS.brightBlack,
        bg: '#0e0e0e'
      };
    case 'forest':
      return {
        char: pick(TREE_GLYPHS, rng.next()),
        fg: siteType === 'failed-charter' ? ANSI_COLORS.green : ANSI_COLORS.brightGreen,
        bg: '#003300',
        anim: 'tree',
        animChar: pick(TREE_GLYPHS, rng.next() + 0.5),
        animFg: ANSI_COLORS.green
      };
    case 'forest-edge':
      return {
        char: rng.next() > 0.35 ? pick(TREE_GLYPHS, rng.next()) : pick(SHRUB_GLYPHS, rng.next()),
        fg: ANSI_COLORS.green,
        bg: '#002200',
        anim: rng.next() > 0.45 ? 'tree' : undefined,
        animChar: pick(SHRUB_GLYPHS, rng.next()),
        animFg: ANSI_COLORS.brightGreen
      };
    case 'scrub':
      return {
        char: pick(SHRUB_GLYPHS, rng.next()),
        fg: ANSI_COLORS.yellow,
        bg: '#1a1500'
      };
    case 'flower':
      return {
        char: pick(FLOWER_GLYPHS, rng.next()),
        fg: pick(FLOWER_COLORS, rng.next()),
        bg: '#001a00',
        anim: 'flower',
        animChar: pick(FLOWER_GLYPHS, rng.next() + 0.4),
        animFg: pick(FLOWER_COLORS, rng.next() + 0.2)
      };
    case 'garden':
      return {
        char: rng.next() > 0.45 ? pick(FLOWER_GLYPHS, rng.next()) : pick(GRASS_GLYPHS, rng.next()),
        fg: rng.next() > 0.5 ? ANSI_COLORS.brightGreen : ANSI_COLORS.brightYellow,
        bg: '#003300',
        anim: 'flower',
        animChar: '*',
        animFg: ANSI_COLORS.brightMagenta
      };
    case 'orchard':
      return {
        char: pick(['♣', '↑', 'τ'] as const, rng.next()),
        fg: ANSI_COLORS.brightGreen,
        bg: '#002800',
        anim: 'tree',
        animChar: '♠',
        animFg: ANSI_COLORS.green
      };
    case 'spoil':
      return {
        char: pick(['░', '▒', '.', ':', '`'] as const, rng.next()),
        fg: ANSI_COLORS.yellow,
        bg: '#1a1008'
      };
    case 'stump':
      return {
        char: pick(['τ', '¥', 'T'] as const, rng.next()),
        fg: ANSI_COLORS.yellow,
        bg: '#1a1500'
      };
    case 'trampled':
      return {
        char: pick(['.', ',', '`', "'", ';'] as const, rng.next()),
        fg: ANSI_COLORS.brightBlack,
        bg: '#0a0a00'
      };
    case 'path':
      return {
        char: '·',
        fg: ANSI_COLORS.yellow,
        bg: '#151008'
      };
    case 'bare':
      return {
        char: elev > 0.5 ? pick(SLOPE_GLYPHS, elev) : pick(['.', '`', ',', ' '] as const, rng.next()),
        fg: ANSI_COLORS.brightBlack,
        bg: '#0c0c0c'
      };
    case 'meadow':
    default: {
      const lush = fertility > 0.45;
      // Always place a grass glyph — no empty black voids
      return {
        char: pick(GRASS_GLYPHS, rng.next() + fertility),
        fg: lush ? ANSI_COLORS.brightGreen : ANSI_COLORS.green,
        bg: lush ? '#001800' : '#001200',
        anim: 'grass',
        animChar: pick(GRASS_GLYPHS, rng.next() + 0.3),
        animFg: lush ? ANSI_COLORS.green : ANSI_COLORS.brightGreen
      };
    }
  }
}

function blendDark(a: string, b: string, t: number): string {
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

function classifyGround(
  elev: number,
  moisture: number,
  fertility: number,
  veg: number,
  ctx: ReturnType<typeof sampleWorldContext>,
  siteType: SiteType,
  nx: number,
  ny: number,
  width: number,
  height: number
): GroundKind {
  // Coastal freeport / harbor sites: shoreline along southern edge
  if ((siteType === 'freeport' || ctx.nearCoast || ctx.nearWater) && ny > height * 0.72) {
    if (moisture > 0.55 || ny > height * 0.85) return 'pond';
    return 'sand';
  }

  // Rocky outcrops as sparse peaks — not blanket grey slabs
  if (elev > 0.88) return 'peak';
  if (elev > 0.78) return 'cliff';
  if (elev > 0.72 && (ctx.biome === 'mountains' || ctx.biome === 'hills')) return 'rock';
  if (elev > 0.74 && ctx.nearMountain) return 'rock';

  if (moisture > 0.78 && elev < 0.48) return 'pond';
  if (moisture > 0.68 && elev < 0.52) return 'marsh';
  if (moisture > 0.62 && Math.abs(ny - height * 0.4) < 2 + moisture * 3) return 'stream';

  // Site-type vegetation bias before generic biomes
  if (siteType === 'company-town') {
    if (veg > 0.68 && fertility > 0.35) return 'stump';
    if (veg > 0.48) return 'spoil';
    if (fertility > 0.35) return 'meadow';
    return 'spoil'; // cleared dirt, never empty void
  }

  if (siteType === 'failed-charter') {
    if (veg > 0.38) return veg > 0.62 ? 'forest' : 'forest-edge';
    if (fertility > 0.5) return 'scrub';
    if (moisture > 0.5) return 'marsh';
    return 'meadow';
  }

  if (siteType === 'commons') {
    if (veg > 0.58 && fertility > 0.45) return 'orchard';
    if (fertility > 0.55 && veg > 0.3) return 'garden';
    if (veg > 0.48) return 'forest-edge';
    if (fertility > 0.4) return 'flower';
    return 'meadow';
  }

  if (siteType === 'guild-city') {
    if (veg > 0.6) return 'forest-edge';
    if (fertility > 0.5 && veg > 0.28) return 'garden';
    if (fertility > 0.35) return 'meadow';
    if (veg > 0.35) return 'scrub';
    return 'meadow';
  }

  // Generic / freeport inland
  if (ctx.nearForest || ctx.biome === 'forest') {
    if (veg > 0.55) return 'forest';
    if (veg > 0.38) return 'forest-edge';
  }

  if (veg > 0.62 && fertility > 0.4) return 'forest';
  if (veg > 0.48) return 'forest-edge';
  if (veg > 0.35 && fertility < 0.4) return 'scrub';
  if (fertility > 0.58 && veg > 0.25) return 'flower';

  // Soft edge variation by position for ecotones
  const edge = Math.min(nx / width, ny / height, 1 - nx / width, 1 - ny / height);
  if (edge < 0.15 && veg > 0.32) return 'forest-edge';

  return 'meadow';
}

/** Poisson-ish cluster mask: high only in sparse blob centers. */
function clusterMask(
  x: number,
  y: number,
  field: { sample(x: number, y: number): number },
  threshold: number,
  radiusNoise: { sample(x: number, y: number): number }
): boolean {
  const v = field.sample(x, y);
  if (v < threshold) return false;
  // Peakiness: require local high relative to neighbors via second sample
  const detail = radiusNoise.sample(x * 0.3, y * 0.3);
  return v > threshold + detail * 0.12;
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

  const elevNoise = createWarpedFbm(`${world.seed}-elev-${site.id}`, 5, 0.06, 5);
  const moistNoise = createWarpedFbm(`${world.seed}-moist-${site.id}`, 4, 0.09, 3.5);
  const fertNoise = createFbm(`${world.seed}-fert-${site.id}`, 4, 2, 0.5, 0.07);
  const vegNoise = createWarpedFbm(`${world.seed}-veg-${site.id}`, 4, 0.11, 4);
  const clusterNoise = createFbm(`${world.seed}-cluster-${site.id}`, 3, 2, 0.55, 0.04);
  const clusterDetail = createFbm(`${world.seed}-cdet-${site.id}`, 2, 2, 0.5, 0.15);

  // Bias elevation from world tile
  const elevBias = (ctx.baseHeight - 0.4) * 0.5;
  const moistBias =
    ctx.nearWater || ctx.nearCoast ? 0.2 :
    ctx.biome === 'forest' ? 0.08 :
    ctx.biome === 'mountains' ? -0.1 : 0;

  const grid: LandscapeTile[][] = [];

  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      let elev = elevNoise.sample(x, y) * 0.85 + elevBias + 0.15;
      let moisture = moistNoise.sample(x, y) * 0.8 + moistBias + 0.1;
      let fertility = fertNoise.sample(x, y);

      elev = clamp01(elev);
      moisture = clamp01(moisture);
      fertility = clamp01(fertility * (1 - elev * 0.3) + moisture * 0.15);

      let veg = vegNoise.sample(x, y);
      // Clustering: boost dense grove patches; keep a meadow floor everywhere else
      if (clusterMask(x, y, clusterNoise, 0.48, clusterDetail)) {
        veg = Math.min(1, veg * 1.35 + 0.15);
      } else if (clusterMask(x, y, clusterNoise, 0.32, clusterDetail)) {
        veg = Math.min(1, veg * 1.1);
      } else {
        // Outside patches: still allow light grass/scrub, not salt-and-pepper trees
        veg *= 0.55;
      }

      // Mountain / hill sites: gentle rim of higher ground, leave a vegetated basin
      if (ctx.biome === 'mountains' || ctx.biome === 'hills') {
        const dx = (x / width) * 2 - 1;
        const dy = (y / height) * 2 - 1;
        const rim = Math.max(0, dx * dx + dy * dy - 0.35);
        elev = clamp01(elev + rim * 0.35);
      } else if (ctx.nearMountain) {
        const dx = (x / width) * 2 - 1;
        const dy = (y / height) * 2 - 1;
        const rim = Math.max(0, dx * dx + dy * dy - 0.55);
        elev = clamp01(elev + rim * 0.18);
      }

      const ground = classifyGround(
        elev, moisture, fertility, veg, ctx, site.type, x, y, width, height
      );

      const style = styleFor(ground, elev, moisture, fertility, rng, site.type);
      grid[y][x] = {
        elevation: elev,
        moisture,
        fertility,
        ground,
        char: style.char,
        fg: style.fg,
        bg: style.bg,
        anim: style.anim,
        animChar: style.animChar,
        animFg: style.animFg
      };
    }
  }

  // Carve streams as connected ribbons (more natural than noise alone)
  carveStream(grid, width, height, rng, site.type);

  // Site-type post-pass flavor
  applySiteFlavor(grid, width, height, site.type, rng);

  // Clearings near buildings, trampled ground around doors, worn paths along streets
  applySettledGround(grid, buildings, streets, site.type, rng);

  return grid;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function carveStream(
  grid: LandscapeTile[][],
  width: number,
  height: number,
  rng: SeededRandom,
  siteType: SiteType
): void {
  if (siteType === 'company-town') return; // drained/cleared
  if (rng.next() > 0.75 && siteType !== 'commons' && siteType !== 'freeport') return;

  let x = rng.nextInt(Math.floor(width * 0.2), Math.floor(width * 0.8));
  let y = 0;
  const pondY = siteType === 'freeport' ? Math.floor(height * 0.75) : height - 1;

  while (y < pondY && y < height - 1) {
    for (let w = -1; w <= 1; w++) {
      const sx = x + w;
      if (sx >= 0 && sx < width) {
        const tile = grid[y][sx];
        if (tile.ground !== 'peak' && tile.ground !== 'cliff') {
          const style = styleFor('stream', tile.elevation, 0.85, tile.fertility, rng, siteType);
          grid[y][sx] = {
            ...tile,
            ground: 'stream',
            moisture: 0.85,
            char: style.char,
            fg: style.fg,
            bg: style.bg,
            anim: style.anim,
            animChar: style.animChar,
            animFg: style.animFg
          };
        }
      }
    }
    y += 1;
    x += rng.nextInt(-1, 1);
    x = Math.max(1, Math.min(width - 2, x));
  }

  // Small pond / pool
  const px = Math.max(3, Math.min(width - 4, x));
  const py = Math.max(3, Math.min(height - 4, pondY - 2));
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy * 2 > 10) continue;
      const tx = px + dx;
      const ty = py + dy;
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue;
      const style = styleFor('pond', 0.2, 0.9, 0.3, rng, siteType);
      grid[ty][tx] = {
        ...grid[ty][tx],
        ground: 'pond',
        moisture: 0.9,
        char: style.char,
        fg: style.fg,
        bg: style.bg,
        anim: style.anim,
        animChar: style.animChar,
        animFg: style.animFg
      };
    }
  }
}

function applySiteFlavor(
  grid: LandscapeTile[][],
  width: number,
  height: number,
  siteType: SiteType,
  rng: SeededRandom
): void {
  if (siteType === 'failed-charter') {
    // Overgrowth: convert bare/meadow toward forest-edge, add mushrooms
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = grid[y][x];
        if ((t.ground === 'meadow' || t.ground === 'bare' || t.ground === 'spoil') && rng.next() > 0.55) {
          const g: GroundKind = rng.next() > 0.5 ? 'forest-edge' : 'scrub';
          const style = styleFor(g, t.elevation, t.moisture, t.fertility, rng, siteType);
          grid[y][x] = { ...t, ground: g, ...pickStyle(style) };
        } else if (t.ground === 'meadow' && rng.next() > 0.88) {
          // mushrooms / fallen logs reclaiming the ruin
          const log = rng.next() > 0.5;
          grid[y][x] = {
            ...t,
            char: log ? '=' : '♠',
            fg: log ? ANSI_COLORS.yellow : ANSI_COLORS.brightMagenta,
            bg: '#001a00',
            anim: undefined
          };
        }
      }
    }
  }

  if (siteType === 'company-town') {
    // Cleared land + spoil heaps toward edges, stump patches
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = grid[y][x];
        if (t.ground === 'forest' || t.ground === 'forest-edge') {
          const g: GroundKind = rng.next() > 0.4 ? 'stump' : 'spoil';
          const style = styleFor(g, t.elevation, t.moisture, t.fertility, rng, siteType);
          grid[y][x] = { ...t, ground: g, ...pickStyle(style) };
        }
        // Spoil piles near map corners
        const edge = Math.min(x, y, width - 1 - x, height - 1 - y);
        if (edge < 4 && rng.next() > 0.5) {
          const style = styleFor('spoil', t.elevation, t.moisture, t.fertility, rng, siteType);
          grid[y][x] = { ...t, ground: 'spoil', ...pickStyle(style) };
        }
      }
    }
  }

  if (siteType === 'commons') {
    // Shared garden beds and orchard clumps (clustered rectangles)
    const plots = rng.nextInt(3, 6);
    for (let i = 0; i < plots; i++) {
      const px = rng.nextInt(4, width - 10);
      const py = rng.nextInt(4, height - 10);
      const pw = rng.nextInt(4, 7);
      const ph = rng.nextInt(3, 5);
      const orchard = rng.next() > 0.5;
      for (let dy = 0; dy < ph; dy++) {
        for (let dx = 0; dx < pw; dx++) {
          const g: GroundKind = orchard ? 'orchard' : 'garden';
          const style = styleFor(g, 0.4, 0.5, 0.8, rng, siteType);
          grid[py + dy][px + dx] = {
            ...grid[py + dy][px + dx],
            ground: g,
            fertility: 0.85,
            ...pickStyle(style)
          };
        }
      }
    }
  }

  if (siteType === 'guild-city') {
    // Tended greens: convert random meadow patches to garden/flower near center
    const cx = width / 2;
    const cy = height / 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        const t = grid[y][x];
        if (dist < 14 && (t.ground === 'meadow' || t.ground === 'scrub') && rng.next() > 0.65) {
          const g: GroundKind = rng.next() > 0.5 ? 'garden' : 'flower';
          const style = styleFor(g, t.elevation, t.moisture, 0.7, rng, siteType);
          grid[y][x] = { ...t, ground: g, ...pickStyle(style) };
        }
      }
    }
  }

  if (siteType === 'freeport') {
    // Ensure southern shoreline strip is sand/water
    for (let y = Math.floor(height * 0.78); y < height; y++) {
      for (let x = 0; x < width; x++) {
        const g: GroundKind = y > height * 0.88 ? 'pond' : 'sand';
        const style = styleFor(g, 0.15, 0.8, 0.2, rng, siteType);
        grid[y][x] = { ...grid[y][x], ground: g, ...pickStyle(style) };
      }
    }
  }
}

function pickStyle(style: Style): Pick<LandscapeTile, 'char' | 'fg' | 'bg' | 'anim' | 'animChar' | 'animFg'> {
  return {
    char: style.char,
    fg: style.fg,
    bg: style.bg,
    anim: style.anim,
    animChar: style.animChar,
    animFg: style.animFg
  };
}

function applySettledGround(
  grid: LandscapeTile[][],
  buildings: Building[],
  streets: Position[],
  siteType: SiteType,
  rng: SeededRandom
): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  // Worn paths along streets (already streets, but soft shoulder)
  for (const s of streets) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const x = s.x + dx;
      const y = s.y + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const t = grid[y][x];
      if (t.ground === 'pond' || t.ground === 'stream' || t.ground === 'peak' || t.ground === 'cliff') continue;
      if (rng.next() > 0.35) {
        const style = styleFor('trampled', t.elevation, t.moisture, t.fertility, rng, siteType);
        grid[y][x] = { ...t, ground: 'trampled', ...pickStyle(style), anim: undefined };
      }
    }
  }

  for (const b of buildings) {
    // Clearing around building footprint
    for (let y = b.y - 2; y < b.y + b.height + 2; y++) {
      for (let x = b.x - 2; x < b.x + b.width + 2; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        // Skip interior of building (renderer will overwrite anyway)
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
          const g: GroundKind = siteType === 'failed-charter' && rng.next() > 0.6 ? 'scrub' : 'trampled';
          const style = styleFor(g, t.elevation, t.moisture, t.fertility, rng, siteType);
          grid[y][x] = { ...t, ground: g, ...pickStyle(style), anim: undefined };
        } else if (
          (t.ground === 'forest' || t.ground === 'forest-edge' || t.ground === 'orchard') &&
          rng.next() > 0.4
        ) {
          const style = styleFor('meadow', t.elevation, t.moisture, t.fertility, rng, siteType);
          grid[y][x] = { ...t, ground: 'meadow', ...pickStyle(style) };
        }
      }
    }

    // Trampled path from door
    if (b.doorX !== undefined && b.doorY !== undefined) {
      let px = b.doorX;
      let py = b.doorY;
      // Step outward from door
      const outX = b.doorX === b.x ? -1 : b.doorX === b.x + b.width - 1 ? 1 : 0;
      const outY = b.doorY === b.y ? -1 : b.doorY === b.y + b.height - 1 ? 1 : 0;
      for (let step = 1; step <= 4; step++) {
        px = b.doorX + outX * step;
        py = b.doorY + outY * step;
        if (px < 0 || py < 0 || px >= width || py >= height) break;
        const t = grid[py][px];
        if (t.ground === 'pond') break;
        const style = styleFor('path', t.elevation, t.moisture, t.fertility, rng, siteType);
        grid[py][px] = { ...t, ground: 'path', ...pickStyle(style), anim: undefined };
      }
    }
  }
}

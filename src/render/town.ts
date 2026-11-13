import type { Town, Building, World, LandscapeTile } from '../sim/types';
import type { RenderContext } from './types';
import { ANSI_COLORS } from './ansiColors';

const FONT_FAMILY = '"Consolas", "DejaVu Sans Mono", "Courier New", monospace';
const MIN_TILE = 8;

/** Choose a tile size so the town map always covers the canvas (no letterbox voids). */
export function getTownTileSize(town: Town, canvas: HTMLCanvasElement): number {
  const fitW = canvas.width / Math.max(1, town.width);
  const fitH = canvas.height / Math.max(1, town.height);
  // Must cover BOTH axes — never cap below what's needed or black bars appear
  return Math.max(MIN_TILE, Math.ceil(Math.max(fitW, fitH)));
}

function worldToScreen(
  worldX: number,
  worldY: number,
  camera: { x: number; y: number },
  canvas: HTMLCanvasElement,
  tileSize: number
): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * tileSize + canvas.width / 2,
    y: (worldY - camera.y) * tileSize + canvas.height / 2
  };
}

const BUILDING_COLORS: Record<string, { wall: string; floor: string; door: string }> = {
  'company-store': { wall: ANSI_COLORS.brightYellow, floor: '#1a1a1a', door: ANSI_COLORS.brightWhite },
  'mill': { wall: ANSI_COLORS.yellow, floor: '#1a1a1a', door: ANSI_COLORS.brightYellow },
  'cannery': { wall: ANSI_COLORS.yellow, floor: '#1a1a1a', door: ANSI_COLORS.brightYellow },
  'barracks': { wall: ANSI_COLORS.brightRed, floor: '#1a1010', door: ANSI_COLORS.brightWhite },
  'company-housing': { wall: ANSI_COLORS.red, floor: '#1a1010', door: ANSI_COLORS.brightRed },
  'dock': { wall: ANSI_COLORS.brightCyan, floor: '#001a2a', door: ANSI_COLORS.brightWhite },
  'market': { wall: ANSI_COLORS.brightYellow, floor: '#1a1500', door: ANSI_COLORS.brightWhite },
  'warehouse': { wall: ANSI_COLORS.white, floor: '#111111', door: ANSI_COLORS.brightWhite },
  'guild-hall': { wall: ANSI_COLORS.brightYellow, floor: '#1a1508', door: ANSI_COLORS.brightWhite },
  'workshop': { wall: ANSI_COLORS.yellow, floor: '#1a1a1a', door: ANSI_COLORS.brightYellow },
  'residence': { wall: ANSI_COLORS.brightWhite, floor: '#141414', door: ANSI_COLORS.white },
  'pantry': { wall: ANSI_COLORS.brightGreen, floor: '#0a1a0a', door: ANSI_COLORS.brightWhite },
  'library': { wall: ANSI_COLORS.brightCyan, floor: '#0a1a1a', door: ANSI_COLORS.brightWhite },
  'bar': { wall: ANSI_COLORS.brightMagenta, floor: '#1a0a1a', door: ANSI_COLORS.brightWhite },
  'venue': { wall: ANSI_COLORS.magenta, floor: '#1a0a1a', door: ANSI_COLORS.brightWhite },
  'ruin': { wall: ANSI_COLORS.brightBlack, floor: '#0a0a0a', door: ANSI_COLORS.brightBlack }
};

interface DrawnTile {
  char: string;
  fg: string;
  bg: string;
  anim?: LandscapeTile['anim'];
  animChar?: string;
  animFg?: string;
  occupied: boolean;
}

const staticCache = new Map<string, { tiles: DrawnTile[][]; width: number; height: number }>();

function buildStaticLayer(town: Town): DrawnTile[][] {
  const tiles: DrawnTile[][] = [];
  const streetSet = new Set(town.streets.map(s => `${s.x},${s.y}`));

  for (let y = 0; y < town.height; y++) {
    tiles[y] = [];
    for (let x = 0; x < town.width; x++) {
      const land = town.landscape[y]?.[x];
      if (streetSet.has(`${x},${y}`)) {
        // High-contrast streets for legibility
        tiles[y][x] = {
          char: '═',
          fg: ANSI_COLORS.white,
          bg: '#1a1810',
          occupied: true
        };
      } else if (land) {
        tiles[y][x] = {
          char: land.char,
          fg: land.fg,
          bg: land.bg,
          anim: land.anim,
          animChar: land.animChar,
          animFg: land.animFg,
          occupied: false
        };
      } else {
        tiles[y][x] = {
          char: ' ',
          fg: ANSI_COLORS.brightBlack,
          bg: '#080c08',
          occupied: false
        };
      }
    }
  }

  for (const building of town.buildings) {
    const colors = BUILDING_COLORS[building.isRuined ? 'ruin' : building.type] ||
      { wall: ANSI_COLORS.brightWhite, floor: '#141414', door: ANSI_COLORS.brightWhite };

    for (let by = building.y; by < building.y + building.height; by++) {
      for (let bx = building.x; bx < building.x + building.width; bx++) {
        if (by < 0 || bx < 0 || by >= town.height || bx >= town.width) continue;
        const isWall = by === building.y ||
          by === building.y + building.height - 1 ||
          bx === building.x ||
          bx === building.x + building.width - 1;
        const isDoor = building.doorX === bx && building.doorY === by;

        if (isDoor) {
          tiles[by][bx] = {
            char: building.isRuined ? '÷' : '+',
            fg: building.isRuined ? ANSI_COLORS.brightBlack : colors.door,
            bg: '#000000',
            occupied: true
          };
        } else if (isWall) {
          tiles[by][bx] = {
            char: building.isRuined ? '▒' : '#',
            fg: building.isRuined ? ANSI_COLORS.brightBlack : colors.wall,
            bg: '#000000',
            occupied: true
          };
        } else {
          tiles[by][bx] = {
            char: building.isRuined ? '·' : '.',
            fg: building.isRuined ? ANSI_COLORS.brightBlack : ANSI_COLORS.brightBlack,
            bg: colors.floor,
            occupied: true
          };
        }
      }
    }
  }

  return tiles;
}

function getStaticLayer(town: Town): DrawnTile[][] {
  const cached = staticCache.get(town.siteId);
  if (cached && cached.width === town.width && cached.height === town.height) {
    return cached.tiles;
  }
  const tiles = buildStaticLayer(town);
  staticCache.set(town.siteId, { tiles, width: town.width, height: town.height });
  return tiles;
}

function timeOfDayTint(now: number): number {
  const phase = (now / 90000) % 1;
  if (phase < 0.2) return 0.78 + phase;
  if (phase < 0.55) return 1;
  if (phase < 0.7) return 0.9;
  return 0.74;
}

function dimColor(hex: string, factor: number): string {
  if (factor >= 0.99) return hex;
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return hex;
  const r = Math.round(((n >> 16) & 0xff) * factor);
  const g = Math.round(((n >> 8) & 0xff) * factor);
  const b = Math.round((n & 0xff) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function invalidateTownCache(siteId?: string): void {
  if (siteId) staticCache.delete(siteId);
  else staticCache.clear();
}

/** Clamp camera so the viewport always shows map tiles (no black voids). */
export function clampTownCamera(
  camera: { x: number; y: number },
  town: Town,
  canvas: HTMLCanvasElement,
  tileSize: number
): void {
  const halfW = canvas.width / (2 * tileSize);
  const halfH = canvas.height / (2 * tileSize);

  if (town.width <= halfW * 2) {
    camera.x = town.width / 2;
  } else {
    camera.x = Math.max(halfW, Math.min(town.width - halfW, camera.x));
  }

  if (town.height <= halfH * 2) {
    camera.y = town.height / 2;
  } else {
    camera.y = Math.max(halfH, Math.min(town.height - halfH, camera.y));
  }
}

export function renderTown(
  world: World,
  town: Town,
  context: RenderContext,
  hoveredBuilding: Building | null,
  animTime: number = performance.now()
): void {
  const { ctx, camera, canvas } = context;
  let tileSize = getTownTileSize(town, canvas);
  // Hard guarantee: never letterbox the map inside the canvas
  while (
    town.width * tileSize < canvas.width ||
    town.height * tileSize < canvas.height
  ) {
    tileSize += 1;
  }
  clampTownCamera(camera, town, canvas, tileSize);

  // Fill with meadow tint matching calm ground
  ctx.fillStyle = '#0c120e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Screen-space iteration — every canvas pixel column/row gets a tile (no letterbox)
  const tilesX = Math.ceil(canvas.width / tileSize) + 1;
  const tilesY = Math.ceil(canvas.height / tileSize) + 1;
  const originX = Math.floor(camera.x - canvas.width / (2 * tileSize));
  const originY = Math.floor(camera.y - canvas.height / (2 * tileSize));

  ctx.font = `${tileSize}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const layer = getStaticLayer(town);
  const tint = timeOfDayTint(animTime);
  const grassPhase = Math.floor(animTime / 480) % 2;
  const flowerPhase = Math.floor(animTime / 620) % 2;
  const waterPhase = Math.floor(animTime / 320) % 2;
  const treePhase = Math.floor(animTime / 900) % 2;
  const reedPhase = Math.floor(animTime / 400) % 2;

  const edgeTile = (x: number, y: number): DrawnTile => {
    const cx = Math.max(0, Math.min(town.width - 1, x));
    const cy = Math.max(0, Math.min(town.height - 1, y));
    return layer[cy][cx];
  };

  for (let sy = 0; sy < tilesY; sy++) {
    for (let sx = 0; sx < tilesX; sx++) {
      const x = originX + sx;
      const y = originY + sy;
      const tile = (x >= 0 && y >= 0 && x < town.width && y < town.height)
        ? layer[y][x]
        : edgeTile(x, y);
      if (!tile) continue;

      let char = tile.char;
      let fg = tile.fg;
      let bg = tile.bg;

      if (!tile.occupied && tile.anim) {
        const sparse = ((x * 73856093) ^ (y * 19349663) ^ Math.floor(animTime / 2000)) % 7 === 0;
        const phase =
          tile.anim === 'water' ? waterPhase :
          tile.anim === 'flower' ? flowerPhase :
          tile.anim === 'tree' ? treePhase :
          tile.anim === 'reed' ? reedPhase :
          grassPhase;

        if (sparse && phase === 1 && tile.animChar) {
          char = tile.animChar;
          if (tile.animFg) fg = tile.animFg;
        }
      }

      fg = dimColor(fg, tint);
      bg = dimColor(bg, Math.min(1, tint + 0.04));

      const screen = worldToScreen(x, y, camera, canvas, tileSize);
      ctx.fillStyle = bg;
      ctx.fillRect(screen.x, screen.y, tileSize + 1, tileSize + 1); // +1 seals seams
      if (char !== ' ') {
        ctx.fillStyle = fg;
        ctx.fillText(char, screen.x + tileSize / 2, screen.y + tileSize / 2);
      }
    }
  }

  if (hoveredBuilding) {
    const labelFontSize = Math.max(10, tileSize * 0.85);
    ctx.font = `${labelFontSize}px ${FONT_FAMILY}`;

    const labelX = hoveredBuilding.x + Math.floor(hoveredBuilding.width / 2);
    const labelY = hoveredBuilding.y - 1;
    const screen = worldToScreen(labelX, labelY, camera, canvas, tileSize);

    const label = `${hoveredBuilding.name}${hoveredBuilding.isRuined ? ' (ruin)' : ''}`;
    ctx.fillStyle = ANSI_COLORS.black;
    ctx.fillText(label, screen.x + 1, screen.y + 1);
    ctx.fillStyle = hoveredBuilding.isRuined ? ANSI_COLORS.brightBlack : ANSI_COLORS.brightWhite;
    ctx.fillText(label, screen.x, screen.y);
    ctx.font = `${tileSize}px ${FONT_FAMILY}`;
  }

  const title = `${town.siteType} · ${town.worldBiome}`;
  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = ANSI_COLORS.black;
  ctx.fillText(title, 13, 16);
  ctx.fillStyle = ANSI_COLORS.brightWhite;
  ctx.fillText(title, 12, 15);

  const instructionText = 'Press ESC or Z to return to world map';
  ctx.textAlign = 'center';
  ctx.fillStyle = ANSI_COLORS.black;
  ctx.fillText(instructionText, canvas.width / 2 + 1, canvas.height - 19);
  ctx.fillStyle = ANSI_COLORS.brightWhite;
  ctx.fillText(instructionText, canvas.width / 2, canvas.height - 20);

  // silence unused
  void world;
}

export function getBuildingAtPosition(town: Town, x: number, y: number): Building | null {
  for (const building of town.buildings) {
    if (
      x >= building.x && x < building.x + building.width &&
      y >= building.y && y < building.y + building.height
    ) {
      return building;
    }
  }
  return null;
}

/** Convert canvas mouse position to town tile coords using current tile size. */
export function screenToTownTile(
  mouseX: number,
  mouseY: number,
  camera: { x: number; y: number },
  canvas: HTMLCanvasElement,
  town: Town
): { x: number; y: number } {
  const tileSize = getTownTileSize(town, canvas);
  return {
    x: Math.floor((mouseX - canvas.width / 2) / tileSize + camera.x),
    y: Math.floor((mouseY - canvas.height / 2) / tileSize + camera.y)
  };
}

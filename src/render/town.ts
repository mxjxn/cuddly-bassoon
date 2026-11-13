import type { Town, Building, World, LandscapeTile } from '../sim/types';
import type { RenderContext } from './types';
import { ANSI_COLORS } from './ansiColors';

const TILE_SIZE = 12;
const FONT_FAMILY = '"Consolas", "DejaVu Sans Mono", "Courier New", monospace';

function worldToScreen(
  worldX: number,
  worldY: number,
  camera: { x: number; y: number },
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * TILE_SIZE + canvas.width / 2,
    y: (worldY - camera.y) * TILE_SIZE + canvas.height / 2
  };
}

const BUILDING_COLORS: Record<string, { wall: string; floor: string; door: string }> = {
  'company-store': { wall: ANSI_COLORS.yellow, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightYellow },
  'mill': { wall: ANSI_COLORS.yellow, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightYellow },
  'cannery': { wall: ANSI_COLORS.yellow, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightYellow },
  'barracks': { wall: ANSI_COLORS.red, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightRed },
  'company-housing': { wall: ANSI_COLORS.red, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightRed },
  'dock': { wall: ANSI_COLORS.cyan, floor: ANSI_COLORS.blue, door: ANSI_COLORS.brightCyan },
  'market': { wall: ANSI_COLORS.brightYellow, floor: ANSI_COLORS.yellow, door: ANSI_COLORS.brightWhite },
  'warehouse': { wall: ANSI_COLORS.brightBlack, floor: ANSI_COLORS.black, door: ANSI_COLORS.white },
  'guild-hall': { wall: ANSI_COLORS.brightYellow, floor: ANSI_COLORS.yellow, door: ANSI_COLORS.brightWhite },
  'workshop': { wall: ANSI_COLORS.yellow, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightYellow },
  'residence': { wall: ANSI_COLORS.white, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightWhite },
  'pantry': { wall: ANSI_COLORS.brightGreen, floor: ANSI_COLORS.green, door: ANSI_COLORS.brightWhite },
  'library': { wall: ANSI_COLORS.brightCyan, floor: ANSI_COLORS.cyan, door: ANSI_COLORS.brightWhite },
  'bar': { wall: ANSI_COLORS.magenta, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightMagenta },
  'venue': { wall: ANSI_COLORS.brightMagenta, floor: ANSI_COLORS.magenta, door: ANSI_COLORS.brightWhite },
  'ruin': { wall: ANSI_COLORS.brightBlack, floor: ANSI_COLORS.black, door: ANSI_COLORS.brightBlack }
};

interface DrawnTile {
  char: string;
  fg: string;
  bg: string;
  anim?: LandscapeTile['anim'];
  animChar?: string;
  animFg?: string;
  occupied: boolean; // building/street — don't animate over
}

/** Cache of static town tile layers keyed by siteId. */
const staticCache = new Map<string, { tiles: DrawnTile[][]; width: number; height: number }>();

function buildStaticLayer(town: Town): DrawnTile[][] {
  const tiles: DrawnTile[][] = [];
  const streetSet = new Set(town.streets.map(s => `${s.x},${s.y}`));

  for (let y = 0; y < town.height; y++) {
    tiles[y] = [];
    for (let x = 0; x < town.width; x++) {
      const land = town.landscape[y]?.[x];
      if (streetSet.has(`${x},${y}`)) {
        tiles[y][x] = {
          char: '═',
          fg: ANSI_COLORS.brightBlack,
          bg: ANSI_COLORS.black,
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
          char: '"',
          fg: ANSI_COLORS.green,
          bg: ANSI_COLORS.black,
          occupied: false
        };
      }
    }
  }

  for (const building of town.buildings) {
    const colors = BUILDING_COLORS[building.isRuined ? 'ruin' : building.type] ||
      { wall: ANSI_COLORS.white, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightWhite };

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
            bg: ANSI_COLORS.black,
            occupied: true
          };
        } else if (isWall) {
          tiles[by][bx] = {
            char: building.isRuined ? '▒' : '#',
            fg: building.isRuined ? ANSI_COLORS.brightBlack : colors.wall,
            bg: ANSI_COLORS.black,
            occupied: true
          };
        } else {
          tiles[by][bx] = {
            char: building.isRuined ? '·' : '.',
            fg: building.isRuined ? ANSI_COLORS.brightBlack : colors.floor,
            bg: ANSI_COLORS.black,
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

function timeOfDayTint(now: number): { multiply: number; shift: string | null } {
  // ~90s day cycle; dawn/dusk slightly warm, night slightly dim
  const phase = (now / 90000) % 1;
  if (phase < 0.2) return { multiply: 0.75 + phase, shift: null }; // dawn
  if (phase < 0.55) return { multiply: 1, shift: null }; // day
  if (phase < 0.7) return { multiply: 0.9, shift: null }; // dusk
  return { multiply: 0.72, shift: null }; // night dim
}

function dimColor(hex: string, factor: number): string {
  if (factor >= 0.99) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * factor);
  const g = Math.round(((n >> 8) & 0xff) * factor);
  const b = Math.round((n & 0xff) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function invalidateTownCache(siteId?: string): void {
  if (siteId) staticCache.delete(siteId);
  else staticCache.clear();
}

export function renderTown(
  world: World,
  town: Town,
  context: RenderContext,
  hoveredBuilding: Building | null,
  animTime: number = performance.now()
): void {
  const { ctx, camera, canvas } = context;

  ctx.fillStyle = ANSI_COLORS.black;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tilesX = Math.ceil(canvas.width / TILE_SIZE) + 4;
  const tilesY = Math.ceil(canvas.height / TILE_SIZE) + 4;
  const startX = Math.max(0, Math.floor(camera.x - tilesX / 2));
  const startY = Math.max(0, Math.floor(camera.y - tilesY / 2));
  const endX = Math.min(town.width, startX + tilesX);
  const endY = Math.min(town.height, startY + tilesY);

  ctx.font = `${TILE_SIZE}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const layer = getStaticLayer(town);
  const tint = timeOfDayTint(animTime);
  // Slow tick ~2Hz for vegetation shimmer; water a bit faster
  const grassPhase = Math.floor(animTime / 480) % 2;
  const flowerPhase = Math.floor(animTime / 620) % 2;
  const waterPhase = Math.floor(animTime / 320) % 2;
  const treePhase = Math.floor(animTime / 900) % 2;
  const reedPhase = Math.floor(animTime / 400) % 2;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = layer[y]?.[x];
      if (!tile) continue;

      let char = tile.char;
      let fg = tile.fg;
      let bg = tile.bg;

      // Sparse animation: only tiles with anim flag, gated by position hash so not all flip
      if (!tile.occupied && tile.anim) {
        const sparse = ((x * 73856093) ^ (y * 19349663) ^ Math.floor(animTime / 2000)) % 5 === 0;
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

      fg = dimColor(fg, tint.multiply);
      bg = dimColor(bg, Math.min(1, tint.multiply + 0.05));

      const screen = worldToScreen(x, y, camera, canvas);
      ctx.fillStyle = bg;
      ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = fg;
      ctx.fillText(char, screen.x + TILE_SIZE / 2, screen.y + TILE_SIZE / 2);
    }
  }

  // Player marker only if somehow in town coords (usually not)
  if (
    world.player.position.x >= startX && world.player.position.x < endX &&
    world.player.position.y >= startY && world.player.position.y < endY &&
    camera.zoomLevel === 'town'
  ) {
    // Town view uses its own camera; skip world-player overlay unless coords align by chance
  }

  if (hoveredBuilding) {
    const labelFontSize = Math.max(10, TILE_SIZE * 0.8);
    ctx.font = `${labelFontSize}px ${FONT_FAMILY}`;

    const labelX = hoveredBuilding.x + Math.floor(hoveredBuilding.width / 2);
    const labelY = hoveredBuilding.y - 1;
    const screen = worldToScreen(labelX, labelY, camera, canvas);

    const label = `${hoveredBuilding.name}${hoveredBuilding.isRuined ? ' (ruin)' : ''}`;
    ctx.fillStyle = ANSI_COLORS.black;
    ctx.fillText(label, screen.x + 1, screen.y + 1);
    ctx.fillStyle = hoveredBuilding.isRuined ? ANSI_COLORS.brightBlack : ANSI_COLORS.brightWhite;
    ctx.fillText(label, screen.x, screen.y);
    ctx.font = `${TILE_SIZE}px ${FONT_FAMILY}`;
  }

  const title = `${town.siteType} · ${town.worldBiome}`;
  ctx.font = `10px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = ANSI_COLORS.black;
  ctx.fillText(title, 13, 15);
  ctx.fillStyle = ANSI_COLORS.brightWhite;
  ctx.fillText(title, 12, 14);

  const instructionText = 'Press ESC or Z to return to world map';
  ctx.textAlign = 'center';
  ctx.fillStyle = ANSI_COLORS.black;
  ctx.fillText(instructionText, canvas.width / 2 + 1, canvas.height - 19);
  ctx.fillStyle = ANSI_COLORS.brightWhite;
  ctx.fillText(instructionText, canvas.width / 2, canvas.height - 20);
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

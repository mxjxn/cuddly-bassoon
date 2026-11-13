import type { Town, Building, World } from '../sim/types';
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

export function renderTown(world: World, town: Town, context: RenderContext, hoveredBuilding: Building | null): void {
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

  const streetSet = new Set(town.streets.map(s => `${s.x},${s.y}`));

  const tiles: Map<string, { char: string; fg: string; bg: string }> = new Map();

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const key = `${x},${y}`;
      const isStreet = streetSet.has(key);
      
      if (isStreet) {
        tiles.set(key, {
          char: '═',
          fg: ANSI_COLORS.brightBlack,
          bg: ANSI_COLORS.black
        });
      } else {
        tiles.set(key, {
          char: ' ',
          fg: ANSI_COLORS.white,
          bg: ANSI_COLORS.green
        });
      }
    }
  }

  for (const building of town.buildings) {
    const colors = BUILDING_COLORS[building.isRuined ? 'ruin' : building.type] || 
                   { wall: ANSI_COLORS.white, floor: ANSI_COLORS.brightBlack, door: ANSI_COLORS.brightWhite };

    for (let by = building.y; by < building.y + building.height; by++) {
      for (let bx = building.x; bx < building.x + building.width; bx++) {
        const key = `${bx},${by}`;
        const isWall = by === building.y || 
                       by === building.y + building.height - 1 || 
                       bx === building.x || 
                       bx === building.x + building.width - 1;
        
        const isDoor = building.doorX === bx && building.doorY === by;
        
        if (isDoor) {
          tiles.set(key, {
            char: building.isRuined ? '÷' : '+',
            fg: building.isRuined ? ANSI_COLORS.brightBlack : colors.door,
            bg: ANSI_COLORS.black
          });
        } else if (isWall) {
          tiles.set(key, {
            char: building.isRuined ? '▒' : '#',
            fg: building.isRuined ? ANSI_COLORS.brightBlack : colors.wall,
            bg: ANSI_COLORS.black
          });
        } else {
          tiles.set(key, {
            char: building.isRuined ? '·' : '.',
            fg: building.isRuined ? ANSI_COLORS.brightBlack : colors.floor,
            bg: ANSI_COLORS.black
          });
        }
      }
    }
  }

  if (world.player.position.x >= startX && world.player.position.x < endX &&
      world.player.position.y >= startY && world.player.position.y < endY) {
    const key = `${world.player.position.x},${world.player.position.y}`;
    tiles.set(key, {
      char: '@',
      fg: ANSI_COLORS.brightWhite,
      bg: ANSI_COLORS.black
    });
  }

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const key = `${x},${y}`;
      const tile = tiles.get(key);
      
      if (tile) {
        const screen = worldToScreen(x, y, camera, canvas);
        
        ctx.fillStyle = tile.bg;
        ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
        
        ctx.fillStyle = tile.fg;
        ctx.fillText(tile.char, screen.x + TILE_SIZE / 2, screen.y + TILE_SIZE / 2);
      }
    }
  }

  if (hoveredBuilding) {
    const labelFontSize = Math.max(10, TILE_SIZE * 0.8);
    ctx.font = `${labelFontSize}px ${FONT_FAMILY}`;
    
    const labelX = hoveredBuilding.x + Math.floor(hoveredBuilding.width / 2);
    const labelY = hoveredBuilding.y - 1;
    const screen = worldToScreen(labelX, labelY, camera, canvas);
    
    ctx.fillStyle = ANSI_COLORS.black;
    ctx.fillText(hoveredBuilding.name, screen.x + 1, screen.y + 1);
    
    ctx.fillStyle = hoveredBuilding.isRuined ? ANSI_COLORS.brightBlack : ANSI_COLORS.brightWhite;
    ctx.fillText(hoveredBuilding.name, screen.x, screen.y);
    
    ctx.font = `${TILE_SIZE}px ${FONT_FAMILY}`;
  }

  const instructionText = "Press ESC or Z to return to world map";
  const instructionFontSize = 10;
  ctx.font = `${instructionFontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  
  ctx.fillStyle = ANSI_COLORS.black;
  ctx.fillText(instructionText, canvas.width / 2 + 1, canvas.height - 19);
  
  ctx.fillStyle = ANSI_COLORS.brightWhite;
  ctx.fillText(instructionText, canvas.width / 2, canvas.height - 20);
}

export function getBuildingAtPosition(town: Town, x: number, y: number): Building | null {
  for (const building of town.buildings) {
    if (x >= building.x && x < building.x + building.width &&
        y >= building.y && y < building.y + building.height) {
      return building;
    }
  }
  return null;
}

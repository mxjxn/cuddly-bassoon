import type { World } from '../sim/types';
import type { RenderContext } from './types';
import { TERRAIN_STYLES, ROAD_STYLES, SITE_STYLES, PLAYER_STYLE, ANSI_COLORS } from './ansiColors';
import { buildRoadConnectivity, getBoxDrawingChar } from './boxDrawing';

const TILE_SIZE = 12;
const FONT_FAMILY = '"Consolas", "DejaVu Sans Mono", "Courier New", monospace';

function worldToScreen(worldX: number, worldY: number, camera: { x: number; y: number }, canvas: HTMLCanvasElement): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * TILE_SIZE + canvas.width / 2,
    y: (worldY - camera.y) * TILE_SIZE + canvas.height / 2
  };
}

function blendColors(color1: string, color2: string, ratio: number): string {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function renderTopDown(world: World, context: RenderContext): void {
  const { ctx, camera, canvas } = context;

  ctx.fillStyle = ANSI_COLORS.black;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tilesX = Math.ceil(canvas.width / TILE_SIZE) + 4;
  const tilesY = Math.ceil(canvas.height / TILE_SIZE) + 4;
  const startX = Math.max(0, Math.floor(camera.x - tilesX / 2));
  const startY = Math.max(0, Math.floor(camera.y - tilesY / 2));
  const endX = Math.min(world.width, startX + tilesX);
  const endY = Math.min(world.height, startY + tilesY);

  ctx.font = `${TILE_SIZE}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Build road connectivity map for box-drawing characters
  const roadConnectivity = buildRoadConnectivity(
    world.roads.filter(r => r.strength >= 0.3)
  );

  // Create a map of road types per tile (for coloring)
  const roadTypeMap = new Map<string, 'trade' | 'share'>();
  for (const road of world.roads) {
    if (road.strength < 0.3) continue;
    for (const point of road.path) {
      const key = `${point.x},${point.y}`;
      if (!roadTypeMap.has(key)) {
        roadTypeMap.set(key, road.type);
      }
    }
  }

  // Create a map of sites by position
  const siteMap = new Map<string, typeof world.sites[0]>();
  for (const site of world.sites) {
    siteMap.set(`${site.x},${site.y}`, site);
  }

  // Render terrain and overlays
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (y >= 0 && y < world.terrain.length && x >= 0 && x < world.terrain[0].length) {
        const terrain = world.terrain[y][x];
        const screen = worldToScreen(x, y, camera, canvas);
        const tileKey = `${x},${y}`;
        
        const terrainStyle = TERRAIN_STYLES[terrain.biome];
        
        // Draw background
        let bgColor: string = terrainStyle.bg;
        
        // Slightly brighten background if resources present
        if (terrain.resources.length > 0) {
          // Mix with white for resource indication
          bgColor = blendColors(terrainStyle.bg, ANSI_COLORS.white, 0.15);
        }
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
        
        // Determine what character to draw
        let char: string = terrainStyle.char;
        let fgColor: string = terrainStyle.fg;
        
        // Check for road
        const roadType = roadTypeMap.get(tileKey);
        if (roadType && roadConnectivity.has(tileKey)) {
          const connectivity = roadConnectivity.get(tileKey)!;
          char = getBoxDrawingChar(connectivity);
          fgColor = ROAD_STYLES[roadType];
        }
        
        // Check for site
        const site = siteMap.get(tileKey);
        if (site) {
          const siteStyle = SITE_STYLES[site.type];
          char = siteStyle.char;
          fgColor = site.active ? siteStyle.fg : ANSI_COLORS.brightBlack;
        }
        
        // Check for player
        if (world.player.position.x === x && world.player.position.y === y) {
          char = PLAYER_STYLE.char;
          fgColor = PLAYER_STYLE.fg;
        }
        
        // Draw character
        ctx.fillStyle = fgColor;
        ctx.fillText(char, screen.x + TILE_SIZE / 2, screen.y + TILE_SIZE / 2);
      }
    }
  }

  // Draw site names (overlays) - only for larger sites
  for (const site of world.sites) {
    const screen = worldToScreen(site.x, site.y, camera, canvas);
    
    if (screen.x < -100 || screen.x > canvas.width + 100 ||
        screen.y < -100 || screen.y > canvas.height + 100) {
      continue;
    }

    if (site.radius >= 2) {
      const nameFontSize = Math.max(8, TILE_SIZE * 0.7);
      ctx.font = `${nameFontSize}px ${FONT_FAMILY}`;
      
      // Draw shadow for readability
      ctx.fillStyle = ANSI_COLORS.black;
      ctx.fillText(site.name, screen.x + TILE_SIZE / 2 + 1, screen.y - TILE_SIZE + 1);
      
      ctx.fillStyle = site.active ? ANSI_COLORS.brightWhite : ANSI_COLORS.white;
      ctx.fillText(site.name, screen.x + TILE_SIZE / 2, screen.y - TILE_SIZE);
      
      // Restore main font
      ctx.font = `${TILE_SIZE}px ${FONT_FAMILY}`;
    }
  }
}

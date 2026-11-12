import type { World } from '../sim/types';
import type { RenderContext } from './types';
import { SITE_COLORS, SITE_GLYPHS, BIOME_COLORS, ROAD_COLORS, PLAYER_COLOR } from './colors';

const TILE_SIZE = 8;

function worldToScreen(worldX: number, worldY: number, camera: { x: number; y: number }, canvas: HTMLCanvasElement): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * TILE_SIZE + canvas.width / 2,
    y: (worldY - camera.y) * TILE_SIZE + canvas.height / 2
  };
}

export function renderTopDown(world: World, context: RenderContext): void {
  const { ctx, camera, canvas } = context;

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tilesX = Math.ceil(canvas.width / TILE_SIZE) + 4;
  const tilesY = Math.ceil(canvas.height / TILE_SIZE) + 4;
  const startX = Math.max(0, Math.floor(camera.x - tilesX / 2));
  const startY = Math.max(0, Math.floor(camera.y - tilesY / 2));
  const endX = Math.min(world.width, startX + tilesX);
  const endY = Math.min(world.height, startY + tilesY);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (y >= 0 && y < world.terrain.length && x >= 0 && x < world.terrain[0].length) {
        const terrain = world.terrain[y][x];
        const screen = worldToScreen(x, y, camera, canvas);
        
        ctx.fillStyle = BIOME_COLORS[terrain.biome];
        ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
        
        if (terrain.resources.length > 0 && TILE_SIZE >= 6) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  for (const road of world.roads) {
    if (road.strength < 0.3) continue;
    
    ctx.strokeStyle = ROAD_COLORS[road.type];
    ctx.lineWidth = Math.max(1, road.strength * 2);
    ctx.globalAlpha = Math.min(1, road.strength);
    ctx.beginPath();
    
    let first = true;
    for (const point of road.path) {
      const screen = worldToScreen(point.x, point.y, camera, canvas);
      if (first) {
        ctx.moveTo(screen.x + TILE_SIZE / 2, screen.y + TILE_SIZE / 2);
        first = false;
      } else {
        ctx.lineTo(screen.x + TILE_SIZE / 2, screen.y + TILE_SIZE / 2);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  for (const site of world.sites) {
    const screen = worldToScreen(site.x, site.y, camera, canvas);
    
    if (screen.x < -100 || screen.x > canvas.width + 100 ||
        screen.y < -100 || screen.y > canvas.height + 100) {
      continue;
    }

    ctx.fillStyle = SITE_COLORS[site.type];
    ctx.globalAlpha = site.active ? 0.25 : 0.1;
    ctx.beginPath();
    ctx.arc(screen.x + TILE_SIZE / 2, screen.y + TILE_SIZE / 2, site.radius * TILE_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = SITE_COLORS[site.type];
    ctx.globalAlpha = site.active ? 1.0 : 0.4;
    const fontSize = Math.max(12, TILE_SIZE * 1.5);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SITE_GLYPHS[site.type], screen.x + TILE_SIZE / 2, screen.y + TILE_SIZE / 2);
    ctx.globalAlpha = 1.0;

    if (TILE_SIZE >= 6) {
      ctx.fillStyle = site.active ? '#ffffff' : '#888888';
      ctx.font = `${Math.max(9, TILE_SIZE)}px monospace`;
      ctx.fillText(site.name, screen.x + TILE_SIZE / 2, screen.y - TILE_SIZE - 2);
    }
  }

  const playerScreen = worldToScreen(world.player.position.x, world.player.position.y, camera, canvas);
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillStyle = PLAYER_COLOR;
  const playerSize = Math.max(16, TILE_SIZE * 2);
  ctx.font = `bold ${playerSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('@', playerScreen.x + TILE_SIZE / 2, playerScreen.y + TILE_SIZE / 2);
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

import type { World } from '../sim/types';
import type { RenderContext } from './types';
import { SITE_COLORS, SITE_GLYPHS, BIOME_COLORS, ROAD_COLORS, PLAYER_COLOR } from './colors';

const TILE_WIDTH = 20;
const TILE_HEIGHT = 10;

function worldToIso(worldX: number, worldY: number, camera: { x: number; y: number }, canvas: HTMLCanvasElement): { x: number; y: number } {
  const relX = worldX - camera.x;
  const relY = worldY - camera.y;
  
  const isoX = (relX - relY) * (TILE_WIDTH / 2);
  const isoY = (relX + relY) * (TILE_HEIGHT / 2);
  
  return {
    x: isoX + canvas.width / 2,
    y: isoY + canvas.height / 2
  };
}

function drawIsometricTile(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, alpha: number = 1.0): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2);
  ctx.lineTo(x, y + TILE_HEIGHT);
  ctx.lineTo(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0f0f0f';
  ctx.lineWidth = 0.3;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

export function renderIsometric(world: World, context: RenderContext): void {
  const { ctx, camera, canvas } = context;

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const renderRadius = 40;
  const tiles: Array<{ x: number; y: number; z: number }> = [];

  for (let x = Math.floor(camera.x - renderRadius); x <= Math.ceil(camera.x + renderRadius); x++) {
    for (let y = Math.floor(camera.y - renderRadius); y <= Math.ceil(camera.y + renderRadius); y++) {
      if (x >= 0 && x < world.width && y >= 0 && y < world.height) {
        tiles.push({ x, y, z: y + x });
      }
    }
  }

  tiles.sort((a, b) => a.z - b.z);

  for (const tile of tiles) {
    const terrain = world.terrain[tile.y][tile.x];
    const screen = worldToIso(tile.x, tile.y, camera, canvas);
    const color = BIOME_COLORS[terrain.biome];
    const alpha = terrain.resources.length > 0 ? 1.0 : 0.9;
    drawIsometricTile(ctx, screen.x, screen.y, color, alpha);
  }

  for (const road of world.roads) {
    if (road.strength < 0.3) continue;
    
    ctx.strokeStyle = ROAD_COLORS[road.type];
    ctx.lineWidth = Math.max(1.5, road.strength * 2.5);
    ctx.globalAlpha = Math.min(1, road.strength * 0.8);
    ctx.beginPath();
    
    let first = true;
    for (const point of road.path) {
      const screen = worldToIso(point.x, point.y, camera, canvas);
      if (first) {
        ctx.moveTo(screen.x, screen.y);
        first = false;
      } else {
        ctx.lineTo(screen.x, screen.y);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  const siteTiles: Array<{ site: any; x: number; y: number; z: number }> = [];
  for (const site of world.sites) {
    for (let dx = -site.radius; dx <= site.radius; dx++) {
      for (let dy = -site.radius; dy <= site.radius; dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= site.radius) {
          const x = Math.floor(site.x + dx);
          const y = Math.floor(site.y + dy);
          if (x >= 0 && x < world.width && y >= 0 && y < world.height) {
            siteTiles.push({ site, x, y, z: y + x });
          }
        }
      }
    }
  }

  siteTiles.sort((a, b) => a.z - b.z);

  for (const { site, x, y } of siteTiles) {
    const screen = worldToIso(x, y, camera, canvas);
    const alpha = site.active ? 0.5 : 0.2;
    drawIsometricTile(ctx, screen.x, screen.y, SITE_COLORS[site.type as keyof typeof SITE_COLORS], alpha);
  }

  const siteMarkers = world.sites.map(site => ({
    site,
    screen: worldToIso(site.x, site.y, camera, canvas),
    z: site.y + site.x
  }));
  siteMarkers.sort((a, b) => a.z - b.z);

  for (const { site, screen } of siteMarkers) {
    ctx.globalAlpha = site.active ? 1.0 : 0.4;
    ctx.fillStyle = SITE_COLORS[site.type as keyof typeof SITE_COLORS];
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(SITE_GLYPHS[site.type as keyof typeof SITE_GLYPHS], screen.x, screen.y - 8);

    ctx.fillStyle = site.active ? '#ffffff' : '#888888';
    ctx.font = '10px monospace';
    ctx.fillText(site.name, screen.x, screen.y - 22);
    ctx.globalAlpha = 1.0;
  }

  const playerScreen = worldToIso(world.player.position.x, world.player.position.y, camera, canvas);
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;
  
  ctx.fillStyle = PLAYER_COLOR;
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('@', playerScreen.x, playerScreen.y - 10);
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

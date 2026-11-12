import { SeededRandom } from './random';
import type { Terrain, BiomeType, ResourceType } from './types';

export function generateTerrain(width: number, height: number, rng: SeededRandom): Terrain[][] {
  const heightmap = generateHeightmap(width, height, rng);
  const waterLevel = 0.35;
  
  const terrain: Terrain[][] = [];
  
  for (let y = 0; y < height; y++) {
    terrain[y] = [];
    for (let x = 0; x < width; x++) {
      const h = heightmap[y][x];
      const biome = determineBiome(h, waterLevel, rng);
      const resources = determineResources(biome, h, rng);
      
      terrain[y][x] = { height: h, biome, resources };
    }
  }
  
  return terrain;
}

function generateHeightmap(width: number, height: number, rng: SeededRandom): number[][] {
  const map: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      map[y][x] = 0;
    }
  }
  
  const octaves = [
    { scale: 8, weight: 0.5 },
    { scale: 16, weight: 0.25 },
    { scale: 32, weight: 0.125 },
    { scale: 64, weight: 0.0625 }
  ];
  
  for (const octave of octaves) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / octave.scale;
        const ny = y / octave.scale;
        const value = perlinNoise(nx, ny, rng);
        map[y][x] += value * octave.weight;
      }
    }
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      map[y][x] = (map[y][x] + 1) / 2;
      
      const edgeX = Math.min(x, width - x - 1) / (width / 2);
      const edgeY = Math.min(y, height - y - 1) / (height / 2);
      const edgeFactor = Math.min(edgeX, edgeY);
      map[y][x] *= edgeFactor;
    }
  }
  
  return map;
}

function perlinNoise(x: number, y: number, rng: SeededRandom): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  
  const hash = (x: number, y: number): number => {
    const h = Math.sin(x * 12.9898 + y * 78.233 + rng.next() * 100) * 43758.5453;
    return h - Math.floor(h);
  };
  
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  
  const u = fade(xf);
  const v = fade(yf);
  
  return lerp(
    lerp(a, b, u),
    lerp(c, d, u),
    v
  ) * 2 - 1;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function determineBiome(height: number, waterLevel: number, rng: SeededRandom): BiomeType {
  if (height < waterLevel) {
    return 'water';
  }
  
  if (height < waterLevel + 0.05) {
    return 'coast';
  }
  
  if (height > 0.7) {
    return 'mountains';
  }
  
  if (height > 0.55) {
    return 'hills';
  }
  
  const forestNoise = rng.next();
  if (forestNoise > 0.6 && height < 0.65) {
    return 'forest';
  }
  
  return 'plains';
}

function determineResources(biome: BiomeType, _height: number, rng: SeededRandom): ResourceType[] {
  const resources: ResourceType[] = [];
  
  switch (biome) {
    case 'mountains':
      if (rng.next() > 0.7) resources.push('ore');
      break;
    case 'hills':
      if (rng.next() > 0.8) resources.push('ore');
      if (rng.next() > 0.7) resources.push('timber');
      break;
    case 'forest':
      resources.push('timber');
      break;
    case 'plains':
      if (rng.next() > 0.5) resources.push('farmland');
      break;
    case 'coast':
      if (rng.next() > 0.6) resources.push('harbor');
      break;
  }
  
  return resources;
}

export function findTerrainWithResource(
  terrain: Terrain[][],
  resource: ResourceType,
  rng: SeededRandom,
  excludePositions: Array<{ x: number; y: number; radius: number }> = []
): { x: number; y: number } | null {
  const candidates: Array<{ x: number; y: number }> = [];
  
  for (let y = 0; y < terrain.length; y++) {
    for (let x = 0; x < terrain[y].length; x++) {
      if (terrain[y][x].resources.includes(resource)) {
        const tooClose = excludePositions.some(pos => {
          const dx = pos.x - x;
          const dy = pos.y - y;
          return Math.sqrt(dx * dx + dy * dy) < pos.radius + 5;
        });
        
        if (!tooClose) {
          candidates.push({ x, y });
        }
      }
    }
  }
  
  if (candidates.length === 0) return null;
  return rng.choice(candidates);
}

export function isAccessible(terrain: Terrain[][], x: number, y: number): boolean {
  if (y < 0 || y >= terrain.length || x < 0 || x >= terrain[0].length) {
    return false;
  }
  return terrain[y][x].biome !== 'water' && terrain[y][x].biome !== 'mountains';
}

export function getTerrainDifficulty(terrain: Terrain[][], x: number, y: number): number {
  if (!isAccessible(terrain, x, y)) return Infinity;
  
  const biome = terrain[y][x].biome;
  switch (biome) {
    case 'plains': return 1;
    case 'coast': return 1.2;
    case 'forest': return 1.5;
    case 'hills': return 2;
    default: return Infinity;
  }
}

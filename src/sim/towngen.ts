import { SeededRandom } from './random';
import { generateLandscape } from './townLandscape';
import type { Site, Town, Building, Position, BuildingType, World } from './types';

export function generateTown(site: Site, world: World): Town {
  const rng = new SeededRandom(`${world.seed}-${site.id}`);

  // Settlement footprint, then pad with wilderness so the view can fill the viewport
  const settleW = Math.max(42, site.radius * 7);
  const settleH = Math.max(34, site.radius * 5);
  const marginX = 40;
  const marginY = 34;
  const width = settleW + marginX * 2;
  const height = settleH + marginY * 2;
  
  const buildings: Building[] = [];
  const streets: Position[] = [];
  const entryPoints: Position[] = [];
  
  switch (site.type) {
    case 'company-town':
      generateCompanyTown(site, settleW, settleH, buildings, streets, entryPoints, rng);
      break;
    case 'freeport':
      generateFreeport(site, settleW, settleH, buildings, streets, entryPoints, rng);
      break;
    case 'guild-city':
      generateGuildCity(site, settleW, settleH, buildings, streets, entryPoints, rng);
      break;
    case 'failed-charter':
      generateFailedCharter(site, settleW, settleH, buildings, streets, entryPoints, rng);
      break;
    case 'commons':
      generateCommons(site, settleW, settleH, buildings, streets, entryPoints, rng);
      break;
  }

  // Offset settlement into the center of the wilderness map
  for (const b of buildings) {
    b.x += marginX;
    b.y += marginY;
    if (b.doorX !== undefined) b.doorX += marginX;
    if (b.doorY !== undefined) b.doorY += marginY;
  }
  for (const s of streets) {
    s.x += marginX;
    s.y += marginY;
  }
  for (const e of entryPoints) {
    e.x += marginX;
    e.y += marginY;
  }

  const landscape = generateLandscape(site, world, width, height, buildings, streets);
  const worldBiome = world.terrain[site.y]?.[site.x]?.biome ?? 'plains';
  
  return {
    siteId: site.id,
    width,
    height,
    buildings,
    streets,
    entryPoints,
    landscape,
    siteType: site.type,
    worldBiome
  };
}

function generateCompanyTown(
  site: Site,
  width: number,
  height: number,
  buildings: Building[],
  streets: Position[],
  entryPoints: Position[],
  rng: SeededRandom
): void {
  generateGrid(width, height, streets, entryPoints, rng);
  
  const hasCompanyStore = site.constructions.includes('company-store');
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  if (hasCompanyStore) {
    buildings.push(createBuilding(
      'company-store',
      'Company Store',
      centerX - 6,
      centerY - 4,
      12,
      8,
      rng
    ));
  }
  
  const millX = centerX + (hasCompanyStore ? 14 : 0);
  buildings.push(createBuilding(
    'mill',
    'Processing Mill',
    millX,
    centerY - 3,
    10,
    6,
    rng
  ));
  
  const barracksCount = Math.floor(site.population / 30);
  for (let i = 0; i < barracksCount; i++) {
    const bx = 5 + (i % 3) * 10;
    const by = 5 + Math.floor(i / 3) * 8;
    buildings.push(createBuilding(
      'barracks',
      `Barracks ${String.fromCharCode(65 + i)}`,
      bx,
      by,
      8,
      6,
      rng
    ));
  }
  
  const housingCount = Math.floor(site.population / 20);
  for (let i = 0; i < housingCount; i++) {
    const hx = width - 15 + (i % 2) * 6;
    const hy = 5 + Math.floor(i / 2) * 7;
    buildings.push(createBuilding(
      'company-housing',
      `Housing Block ${i + 1}`,
      hx,
      hy,
      5,
      5,
      rng
    ));
  }
  
  if (site.population > 80) {
    buildings.push(createBuilding(
      'bar',
      'The Wage Cage',
      centerX - 15,
      centerY + 8,
      8,
      6,
      rng
    ));
  }
}

function generateFreeport(
  site: Site,
  width: number,
  height: number,
  buildings: Building[],
  streets: Position[],
  entryPoints: Position[],
  rng: SeededRandom
): void {
  generateGrid(width, height, streets, entryPoints, rng, 'irregular');
  
  const docksY = height - 10;
  const dockCount = rng.nextInt(2, 4);
  
  for (let i = 0; i < dockCount; i++) {
    const dx = 5 + i * 12;
    buildings.push(createBuilding(
      'dock',
      `Pier ${i + 1}`,
      dx,
      docksY,
      10,
      8,
      rng
    ));
  }
  
  const marketX = Math.floor(width / 2) - 8;
  const marketY = Math.floor(height / 2) - 6;
  buildings.push(createBuilding(
    'market',
    'Free Market',
    marketX,
    marketY,
    16,
    12,
    rng
  ));
  
  const hasWarehouse = site.constructions.includes('warehouse');
  if (hasWarehouse) {
    const warehouseCount = rng.nextInt(2, 4);
    for (let i = 0; i < warehouseCount; i++) {
      const wx = 5 + i * 10;
      const wy = 5;
      buildings.push(createBuilding(
        'warehouse',
        `Warehouse ${String.fromCharCode(65 + i)}`,
        wx,
        wy,
        9,
        7,
        rng
      ));
    }
  }
  
  const residenceCount = Math.floor(site.population / 15);
  for (let i = 0; i < residenceCount; i++) {
    const rx = width - 20 + (i % 3) * 6;
    const ry = 10 + Math.floor(i / 3) * 7;
    buildings.push(createBuilding(
      'residence',
      `Residence ${i + 1}`,
      rx,
      ry,
      5,
      5,
      rng
    ));
  }
  
  buildings.push(createBuilding(
    'bar',
    'The Free Anchor',
    Math.floor(width / 2) + 10,
    Math.floor(height / 2),
    7,
    6,
    rng
  ));
}

function generateGuildCity(
  site: Site,
  width: number,
  height: number,
  buildings: Building[],
  streets: Position[],
  entryPoints: Position[],
  rng: SeededRandom
): void {
  generateGrid(width, height, streets, entryPoints, rng, 'radial');
  
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  const guildHallCount = rng.nextInt(2, 4);
  const angleStep = (Math.PI * 2) / guildHallCount;
  const radius = 12;
  
  const guildTypes = ['Smiths', 'Carpenters', 'Weavers', 'Masons'];
  for (let i = 0; i < guildHallCount; i++) {
    const angle = i * angleStep;
    const gx = Math.floor(centerX + Math.cos(angle) * radius);
    const gy = Math.floor(centerY + Math.sin(angle) * radius);
    
    buildings.push(createBuilding(
      'guild-hall',
      `${guildTypes[i % guildTypes.length]} Guild Hall`,
      gx,
      gy,
      10,
      8,
      rng
    ));
  }
  
  const hasWorkshop = site.constructions.includes('workshop');
  if (hasWorkshop) {
    const workshopCount = rng.nextInt(3, 6);
    for (let i = 0; i < workshopCount; i++) {
      const wx = 8 + (i % 4) * 8;
      const wy = 8 + Math.floor(i / 4) * 9;
      buildings.push(createBuilding(
        'workshop',
        `Workshop ${i + 1}`,
        wx,
        wy,
        6,
        6,
        rng
      ));
    }
  }
  
  const residenceCount = Math.floor(site.population / 12);
  for (let i = 0; i < residenceCount; i++) {
    const rx = width - 18 + (i % 2) * 7;
    const ry = 5 + Math.floor(i / 2) * 8;
    buildings.push(createBuilding(
      'residence',
      `Master's House ${i + 1}`,
      rx,
      ry,
      6,
      6,
      rng
    ));
  }
  
  buildings.push(createBuilding(
    'venue',
    'Guild Commons',
    centerX - 5,
    centerY - 5,
    10,
    10,
    rng
  ));
}

function generateFailedCharter(
  site: Site,
  width: number,
  height: number,
  buildings: Building[],
  streets: Position[],
  entryPoints: Position[],
  rng: SeededRandom
): void {
  generateGrid(width, height, streets, entryPoints, rng, 'irregular');
  
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  const ruinedStore = createBuilding(
    'company-store',
    'Abandoned Store',
    centerX - 6,
    centerY - 4,
    12,
    8,
    rng
  );
  ruinedStore.isRuined = true;
  buildings.push(ruinedStore);
  
  const ruinCount = rng.nextInt(5, 10);
  for (let i = 0; i < ruinCount; i++) {
    const rx = 5 + rng.nextInt(0, width - 15);
    const ry = 5 + rng.nextInt(0, height - 15);
    const ruinType = rng.choice(['mill', 'barracks', 'company-housing', 'warehouse'] as BuildingType[]);
    const ruin = createBuilding(
      ruinType,
      `Ruin ${i + 1}`,
      rx,
      ry,
      rng.nextInt(5, 10),
      rng.nextInt(5, 8),
      rng
    );
    ruin.isRuined = true;
    buildings.push(ruin);
  }
  
  const survivorCount = Math.floor(site.population / 10);
  for (let i = 0; i < survivorCount; i++) {
    const sx = width - 12 + (i % 2) * 6;
    const sy = 8 + Math.floor(i / 2) * 7;
    buildings.push(createBuilding(
      'residence',
      `Survivor Shelter ${i + 1}`,
      sx,
      sy,
      4,
      4,
      rng
    ));
  }
  
  if (site.population > 20) {
    buildings.push(createBuilding(
      'bar',
      'Last Stand Tavern',
      centerX + 10,
      centerY + 6,
      6,
      5,
      rng
    ));
  }
}

function generateCommons(
  site: Site,
  width: number,
  height: number,
  buildings: Building[],
  streets: Position[],
  entryPoints: Position[],
  rng: SeededRandom
): void {
  generateGrid(width, height, streets, entryPoints, rng, 'organic');
  
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  const hasPantry = site.constructions.includes('pantry');
  if (hasPantry) {
    buildings.push(createBuilding(
      'pantry',
      'Community Pantry',
      centerX - 6,
      centerY - 5,
      12,
      10,
      rng
    ));
  }
  
  buildings.push(createBuilding(
    'library',
    'Free Library',
    centerX + (hasPantry ? 8 : -6),
    centerY - 4,
    10,
    8,
    rng
  ));
  
  const plotCount = Math.floor(site.population / 5);
  for (let i = 0; i < plotCount; i++) {
    const px = 5 + (i % 5) * 7;
    const py = height - 20 + Math.floor(i / 5) * 7;
    buildings.push(createBuilding(
      'residence',
      `Shared Plot ${i + 1}`,
      px,
      py,
      5,
      5,
      rng
    ));
  }
  
  const hasWorkshop = site.constructions.includes('workshop');
  if (hasWorkshop) {
    const workshopCount = rng.nextInt(2, 4);
    for (let i = 0; i < workshopCount; i++) {
      const wx = 8 + i * 10;
      const wy = 8;
      buildings.push(createBuilding(
        'workshop',
        `Cooperative Workshop ${i + 1}`,
        wx,
        wy,
        7,
        6,
        rng
      ));
    }
  }
  
  buildings.push(createBuilding(
    'venue',
    'Assembly Hall',
    centerX - 8,
    centerY + 8,
    16,
    10,
    rng
  ));
  
  if (site.population > 30) {
    buildings.push(createBuilding(
      'bar',
      'Solidarity Café',
      centerX + 10,
      centerY + 8,
      7,
      6,
      rng
    ));
  }
}

function generateGrid(
  width: number,
  height: number,
  streets: Position[],
  entryPoints: Position[],
  rng: SeededRandom,
  style: 'grid' | 'radial' | 'irregular' | 'organic' = 'grid'
): void {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  if (style === 'grid') {
    for (let x = 0; x < width; x++) {
      streets.push({ x, y: centerY });
    }
    for (let y = 0; y < height; y++) {
      streets.push({ x: centerX, y });
    }
    
    for (let i = 1; i < 3; i++) {
      const offset = i * 12;
      if (centerY - offset > 0) {
        for (let x = 0; x < width; x++) {
          streets.push({ x, y: centerY - offset });
        }
      }
      if (centerY + offset < height) {
        for (let x = 0; x < width; x++) {
          streets.push({ x, y: centerY + offset });
        }
      }
    }
    
    for (let i = 1; i < 3; i++) {
      const offset = i * 12;
      if (centerX - offset > 0) {
        for (let y = 0; y < height; y++) {
          streets.push({ x: centerX - offset, y });
        }
      }
      if (centerX + offset < width) {
        for (let y = 0; y < height; y++) {
          streets.push({ x: centerX + offset, y });
        }
      }
    }
  } else if (style === 'radial') {
    for (let x = 0; x < width; x++) {
      streets.push({ x, y: centerY });
    }
    for (let y = 0; y < height; y++) {
      streets.push({ x: centerX, y });
    }
    
    const spokes = 6;
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2;
      for (let r = 0; r < Math.min(width, height) / 2; r++) {
        const sx = Math.floor(centerX + Math.cos(angle) * r);
        const sy = Math.floor(centerY + Math.sin(angle) * r);
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          streets.push({ x: sx, y: sy });
        }
      }
    }
  } else if (style === 'irregular') {
    for (let x = 0; x < width; x++) {
      const y = centerY + rng.nextInt(-2, 2);
      if (y >= 0 && y < height) {
        streets.push({ x, y });
      }
    }
    for (let y = 0; y < height; y++) {
      const x = centerX + rng.nextInt(-2, 2);
      if (x >= 0 && x < width) {
        streets.push({ x, y });
      }
    }
  } else if (style === 'organic') {
    for (let x = 0; x < width; x++) {
      const y = centerY + Math.floor(Math.sin(x * 0.2) * 3);
      if (y >= 0 && y < height) {
        streets.push({ x, y });
      }
    }
    for (let y = 0; y < height; y++) {
      const x = centerX + Math.floor(Math.sin(y * 0.15) * 4);
      if (x >= 0 && x < width) {
        streets.push({ x, y });
      }
    }
  }
  
  entryPoints.push({ x: 0, y: centerY });
  entryPoints.push({ x: width - 1, y: centerY });
  entryPoints.push({ x: centerX, y: 0 });
  entryPoints.push({ x: centerX, y: height - 1 });
}

function createBuilding(
  type: BuildingType,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  rng: SeededRandom
): Building {
  const doorSide = rng.nextInt(0, 3);
  let doorX: number | undefined;
  let doorY: number | undefined;
  
  switch (doorSide) {
    case 0:
      doorX = x + Math.floor(width / 2);
      doorY = y;
      break;
    case 1:
      doorX = x + width - 1;
      doorY = y + Math.floor(height / 2);
      break;
    case 2:
      doorX = x + Math.floor(width / 2);
      doorY = y + height - 1;
      break;
    case 3:
      doorX = x;
      doorY = y + Math.floor(height / 2);
      break;
  }
  
  return {
    id: `${type}-${x}-${y}`,
    type,
    name,
    x,
    y,
    width,
    height,
    doorX,
    doorY
  };
}

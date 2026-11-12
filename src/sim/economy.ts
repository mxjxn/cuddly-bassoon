import type { Site, SiteType, Road, RoadType, HistoryEvent, Terrain, ConstructionType } from './types';
import { SeededRandom } from './random';
import { findPath } from './pathfinding';

const SITE_NAMES = {
  'company-town': [
    'New Providence', 'Millwork', 'Ironhaven', 'Coalridge', 'Factorytown',
    'Gearford', 'Steamport', 'Forge City', 'Brassholm', 'Deepmine', 'Pitton',
    'Industry', 'Smeltworks', 'Extraction Point', 'Company Hold'
  ],
  'freeport': [
    'Crossroads', 'Haven', 'Liberty Bay', 'Freehaven', 'Open Harbor',
    'Waypoint', 'Passage', 'Refuge', 'Threshold', 'Trade Point', 'The Exchange'
  ],
  'guild-city': [
    'Craftholm', 'Artisan\'s Rest', 'Guild Quarter', 'Masterton', 'Maker\'s End',
    'Workshop City', 'The Collective', 'Craftgate', 'Skilled Hands', 'Masterwork'
  ],
  'failed-charter': [],
  'commons': [
    'The Commons', 'Mutual Camp', 'Free Camp', 'Share Circle', 'Open Ground',
    'The Gathering', 'Common Field', 'Meeting Place', 'Share Point', 'Solidarity'
  ]
};

export function setupSiteProduction(site: Site): void {
  site.production = {};
  site.needs = {};
  
  switch (site.type) {
    case 'company-town':
      if (site.resources.ore > 0) {
        site.production.ore = site.population * 0.5;
        site.needs.food = site.population * 0.3;
        site.needs.tools = site.population * 0.1;
      }
      break;
      
    case 'guild-city':
      site.production.goods = site.population * 0.3;
      site.production.tools = site.population * 0.2;
      site.needs.ore = site.population * 0.1;
      site.needs.timber = site.population * 0.1;
      site.needs.food = site.population * 0.2;
      break;
      
    case 'freeport':
      site.needs.food = site.population * 0.2;
      site.needs.goods = site.population * 0.1;
      break;
      
    case 'commons':
      if (site.resources.farmland > 0) {
        site.production.food = site.population * 0.4;
      }
      if (site.resources.timber > 0) {
        site.production.timber = site.population * 0.2;
      }
      break;
  }
}

export function findTradingPartner(
  site: Site,
  sites: Site[],
  need: string
): Site | null {
  let bestPartner: Site | null = null;
  let bestSurplus = 0;
  
  for (const other of sites) {
    if (other.id === site.id || !other.active) continue;
    
    const production = (other.production as any)[need] || 0;
    const consumption = (other.needs as any)[need] || 0;
    const surplus = production - consumption;
    
    if (surplus > bestSurplus) {
      bestSurplus = surplus;
      bestPartner = other;
    }
  }
  
  return bestPartner;
}

export function createRoad(
  from: Site,
  to: Site,
  type: RoadType,
  terrain: Terrain[][],
  roads: Road[]
): Road | null {
  const existingRoad = roads.find(r => 
    (r.from === from.id && r.to === to.id) ||
    (r.from === to.id && r.to === from.id)
  );
  
  if (existingRoad) {
    existingRoad.strength += 0.5;
    existingRoad.type = type;
    return existingRoad;
  }
  
  const path = findPath(terrain, 
    { x: Math.floor(from.x), y: Math.floor(from.y) },
    { x: Math.floor(to.x), y: Math.floor(to.y) }
  );
  
  if (!path) return null;
  
  const road: Road = {
    id: `road-${roads.length}`,
    type,
    from: from.id,
    to: to.id,
    strength: 1,
    path
  };
  
  roads.push(road);
  return road;
}

export function decayRoads(roads: Road[], decayRate: number = 0.1): void {
  for (const road of roads) {
    road.strength = Math.max(0, road.strength - decayRate);
  }
}

export function removeDeadRoads(roads: Road[]): Road[] {
  return roads.filter(r => r.strength > 0.2);
}

export function addConstruction(site: Site, type: ConstructionType): boolean {
  if (site.constructions.includes(type)) return false;
  site.constructions.push(type);
  return true;
}

export function attemptSiteConstruction(
  site: Site,
  roads: Road[]
): ConstructionType | null {
  const hasConnection = roads.some(r => r.from === site.id || r.to === site.id);
  
  if (!hasConnection) return null;
  
  switch (site.type) {
    case 'company-town':
      if (!site.constructions.includes('grid')) {
        return 'grid';
      }
      if (!site.constructions.includes('company-store') && site.population > 50) {
        return 'company-store';
      }
      break;
      
    case 'freeport':
      if (site.resources.harbor > 0 && !site.constructions.includes('dock')) {
        return 'dock';
      }
      if (!site.constructions.includes('warehouse') && site.population > 40) {
        return 'warehouse';
      }
      break;
      
    case 'guild-city':
      if (!site.constructions.includes('workshop') && site.population > 30) {
        return 'workshop';
      }
      break;
      
    case 'commons':
      if (!site.constructions.includes('pantry') && site.population > 20) {
        return 'pantry';
      }
      break;
  }
  
  return null;
}

export function checkSiteFailure(
  site: Site,
  roads: Road[],
  rng: SeededRandom
): boolean {
  if (site.type === 'failed-charter' || site.type === 'commons') return false;
  
  const connectedRoads = roads.filter(r => 
    (r.from === site.id || r.to === site.id) && r.strength > 0.5
  );
  
  if (site.type === 'company-town') {
    if (site.resources.ore < 0.5 || connectedRoads.length === 0) {
      if (rng.next() > 0.8) {
        return true;
      }
    }
  }
  
  return false;
}

export function failSite(site: Site, year: number): HistoryEvent {
  const oldName = site.name;
  site.active = false;
  site.population = Math.floor(site.population * 0.2);
  site.type = 'failed-charter';
  
  const failedNames = [
    `Ruins of ${oldName}`,
    `Old ${oldName}`,
    `Abandoned ${oldName}`,
    `${oldName} Ruins`,
    `Dead ${oldName}`
  ];
  
  site.name = failedNames[Math.floor(Math.random() * failedNames.length)];
  
  return {
    year,
    description: `${oldName} collapsed after the Company pulled out. The charter was voided and most residents fled.`,
    siteId: site.id,
    importance: 8
  };
}

export function attemptCommonsFormation(
  sites: Site[],
  failedSite: Site,
  terrain: Terrain[][],
  year: number,
  rng: SeededRandom
): { site: Site; event: HistoryEvent } | null {
  if (rng.next() < 0.6) return null;
  
  const dx = rng.nextInt(-8, 8);
  const dy = rng.nextInt(-8, 8);
  const x = Math.max(5, Math.min(terrain[0].length - 5, failedSite.x + dx));
  const y = Math.max(5, Math.min(terrain.length - 5, failedSite.y + dy));
  
  const usedNames = new Set(sites.map(s => s.name));
  const availableNames = SITE_NAMES.commons.filter(n => !usedNames.has(n));
  const name = availableNames.length > 0 ? rng.choice(availableNames) : 'New Commons';
  
  const site: Site = {
    id: `site-${sites.length}`,
    type: 'commons',
    name,
    x,
    y,
    radius: 3,
    foundedYear: year,
    population: 15,
    active: true,
    resources: {
      ore: terrain[Math.floor(y)][Math.floor(x)].resources.includes('ore') ? 1 : 0,
      timber: terrain[Math.floor(y)][Math.floor(x)].resources.includes('timber') ? 1 : 0,
      farmland: terrain[Math.floor(y)][Math.floor(x)].resources.includes('farmland') ? 1 : 0,
      harbor: 0
    },
    production: {},
    needs: {},
    constructions: []
  };
  
  setupSiteProduction(site);
  
  const event: HistoryEvent = {
    year,
    description: `${name} emerged from the remnants of ${failedSite.name}, built on mutual aid and resource sharing.`,
    siteId: site.id,
    importance: 6
  };
  
  return { site, event };
}

export function getUnusedSiteName(type: SiteType, usedNames: Set<string>, rng: SeededRandom): string {
  const pool = SITE_NAMES[type];
  if (pool.length === 0) return `Site ${Math.floor(rng.next() * 1000)}`;
  
  const available = pool.filter(n => !usedNames.has(n));
  if (available.length === 0) {
    return `${rng.choice(pool)} ${Math.floor(rng.next() * 100)}`;
  }
  
  return rng.choice(available);
}

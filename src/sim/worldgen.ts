import { SeededRandom } from './random';
import type { World, Site, Road, HistoryEvent } from './types';
import { generateTerrain, findTerrainWithResource } from './terrain';
import {
  setupSiteProduction,
  findTradingPartner,
  createRoad,
  decayRoads,
  removeDeadRoads,
  attemptSiteConstruction,
  addConstruction,
  checkSiteFailure,
  failSite,
  attemptCommonsFormation,
  getUnusedSiteName
} from './economy';

export function generateWorld(seed: string): World {
  const rng = new SeededRandom(seed);
  const width = 300;
  const height = 200;
  
  const terrain = generateTerrain(width, height, rng);
  
  const sites: Site[] = [];
  const roads: Road[] = [];
  const history: HistoryEvent[] = [];
  
  const startYear = 1850;
  let currentYear = startYear;
  
  foundInitialSites(sites, terrain, rng, currentYear, history);
  
  const simulationYears = 80;
  for (let year = 0; year < simulationYears; year++) {
    currentYear = startYear + year;
    simulateYear(sites, roads, terrain, currentYear, rng, history);
  }
  
  history.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return b.importance - a.importance;
  });
  
  const importantHistory = history
    .filter(h => h.importance >= 5)
    .slice(0, 50);
  
  const spawnSite = sites.find(s => s.type === 'commons' && s.active) || 
                    sites.find(s => s.active) || 
                    sites[0];
  
  const player = {
    position: {
      x: spawnSite.x + rng.nextInt(-2, 2),
      y: spawnSite.y + rng.nextInt(-2, 2)
    }
  };
  
  return {
    seed,
    width,
    height,
    terrain,
    sites,
    roads: roads.filter(r => r.strength > 0.3),
    history: importantHistory,
    player,
    currentYear
  };
}

function foundInitialSites(
  sites: Site[],
  terrain: any[][],
  rng: SeededRandom,
  startYear: number,
  history: HistoryEvent[]
): void {
  const usedNames = new Set<string>();
  
  const numCompanyTowns = rng.nextInt(6, 10);
  for (let i = 0; i < numCompanyTowns; i++) {
    const pos = findTerrainWithResource(terrain, 'ore', rng, sites);
    if (pos) {
      const name = getUnusedSiteName('company-town', usedNames, rng);
      usedNames.add(name);
      
      const site: Site = {
        id: `site-${sites.length}`,
        type: 'company-town',
        name,
        x: pos.x,
        y: pos.y,
        radius: rng.nextInt(5, 8),
        foundedYear: startYear + rng.nextInt(0, 10),
        population: rng.nextInt(80, 150),
        active: true,
        resources: {
          ore: 1,
          timber: terrain[pos.y][pos.x].resources.includes('timber') ? 1 : 0,
          farmland: 0,
          harbor: 0
        },
        production: {},
        needs: {},
        constructions: []
      };
      
      setupSiteProduction(site);
      sites.push(site);
      
      history.push({
        year: site.foundedYear,
        description: `The Company chartered ${name} after discovering rich ore deposits. Workers flooded in seeking wages.`,
        siteId: site.id,
        importance: 7
      });
    }
  }
  
  const numFreeports = rng.nextInt(3, 6);
  for (let i = 0; i < numFreeports; i++) {
    const pos = findTerrainWithResource(terrain, 'harbor', rng, sites);
    if (pos) {
      const name = getUnusedSiteName('freeport', usedNames, rng);
      usedNames.add(name);
      
      const site: Site = {
        id: `site-${sites.length}`,
        type: 'freeport',
        name,
        x: pos.x,
        y: pos.y,
        radius: rng.nextInt(4, 7),
        foundedYear: startYear + rng.nextInt(0, 15),
        population: rng.nextInt(60, 120),
        active: true,
        resources: {
          ore: 0,
          timber: 0,
          farmland: 0,
          harbor: 1
        },
        production: {},
        needs: {},
        constructions: []
      };
      
      setupSiteProduction(site);
      sites.push(site);
      
      history.push({
        year: site.foundedYear,
        description: `${name} was established as a neutral trading port, beyond Company control.`,
        siteId: site.id,
        importance: 6
      });
    }
  }
  
  const numGuildCities = rng.nextInt(3, 5);
  for (let i = 0; i < numGuildCities; i++) {
    const pos = findTerrainWithResource(terrain, 'timber', rng, sites);
    if (pos) {
      const name = getUnusedSiteName('guild-city', usedNames, rng);
      usedNames.add(name);
      
      const site: Site = {
        id: `site-${sites.length}`,
        type: 'guild-city',
        name,
        x: pos.x,
        y: pos.y,
        radius: rng.nextInt(4, 6),
        foundedYear: startYear + rng.nextInt(0, 20),
        population: rng.nextInt(50, 100),
        active: true,
        resources: {
          ore: terrain[pos.y][pos.x].resources.includes('ore') ? 1 : 0,
          timber: 1,
          farmland: 0,
          harbor: 0
        },
        production: {},
        needs: {},
        constructions: []
      };
      
      setupSiteProduction(site);
      sites.push(site);
      
      history.push({
        year: site.foundedYear,
        description: `Master artisans founded ${name} to preserve their crafts outside corporate hierarchy.`,
        siteId: site.id,
        importance: 6
      });
    }
  }
  
  const numCommons = rng.nextInt(2, 4);
  for (let i = 0; i < numCommons; i++) {
    const pos = findTerrainWithResource(terrain, 'farmland', rng, sites);
    if (pos) {
      const name = getUnusedSiteName('commons', usedNames, rng);
      usedNames.add(name);
      
      const site: Site = {
        id: `site-${sites.length}`,
        type: 'commons',
        name,
        x: pos.x,
        y: pos.y,
        radius: 3,
        foundedYear: startYear + rng.nextInt(5, 25),
        population: rng.nextInt(20, 40),
        active: true,
        resources: {
          ore: 0,
          timber: terrain[pos.y][pos.x].resources.includes('timber') ? 1 : 0,
          farmland: 1,
          harbor: 0
        },
        production: {},
        needs: {},
        constructions: []
      };
      
      setupSiteProduction(site);
      sites.push(site);
      
      history.push({
        year: site.foundedYear,
        description: `${name} emerged as people built mutual aid networks outside the wage system.`,
        siteId: site.id,
        importance: 5
      });
    }
  }
}

function simulateYear(
  sites: Site[],
  roads: Road[],
  terrain: any[][],
  year: number,
  rng: SeededRandom,
  history: HistoryEvent[]
): void {
  for (const site of sites) {
    if (!site.active) continue;
    
    for (const [need] of Object.entries(site.needs)) {
      const partner = findTradingPartner(site, sites, need);
      if (partner) {
        const road = createRoad(site, partner, 'trade', terrain, roads);
        if (road && year % 5 === 0 && rng.next() > 0.7) {
          history.push({
            year,
            description: `Trade route established between ${site.name} and ${partner.name}, carrying ${need}.`,
            siteId: site.id,
            roadId: road.id,
            importance: 4
          });
        }
      }
    }
    
    if (site.type === 'commons' && rng.next() > 0.9) {
      const nearbyFailed = sites.find(s => 
        s.type === 'failed-charter' && 
        Math.hypot(s.x - site.x, s.y - site.y) < 30
      );
      
      if (nearbyFailed) {
        const road = createRoad(site, nearbyFailed, 'share', terrain, roads);
        if (road && rng.next() > 0.8) {
          history.push({
            year,
            description: `${site.name} extended a share route to aid survivors in ${nearbyFailed.name}.`,
            siteId: site.id,
            roadId: road.id,
            importance: 6
          });
        }
      }
    }
  }
  
  if (year % 3 === 0) {
    for (const site of sites) {
      if (!site.active) continue;
      
      const construction = attemptSiteConstruction(site, roads);
      if (construction) {
        if (addConstruction(site, construction)) {
          if (rng.next() > 0.7) {
            history.push({
              year,
              description: `${site.name} completed construction of a ${construction.replace('-', ' ')}.`,
              siteId: site.id,
              importance: 3
            });
          }
        }
      }
    }
  }
  
  if (year % 8 === 0) {
    for (const site of sites) {
      if (!site.active) continue;
      
      if (checkSiteFailure(site, roads, rng)) {
        const event = failSite(site, year);
        history.push(event);
        
        const commonsResult = attemptCommonsFormation(sites, site, terrain, year + 1, rng);
        if (commonsResult) {
          sites.push(commonsResult.site);
          history.push(commonsResult.event);
        }
      }
    }
  }
  
  decayRoads(roads, 0.05);
  
  if (year % 10 === 0) {
    const beforeCount = roads.length;
    const cleaned = removeDeadRoads(roads);
    const removed = beforeCount - cleaned.length;
    
    if (removed > 0) {
      roads.length = 0;
      roads.push(...cleaned);
    }
  }
}

export function getSiteAtPosition(world: World, x: number, y: number): Site | null {
  for (const site of world.sites) {
    const dx = site.x - x;
    const dy = site.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= site.radius) {
      return site;
    }
  }
  return null;
}

export function getNearestSite(world: World, x: number, y: number): { site: Site; distance: number } | null {
  let nearest: { site: Site; distance: number } | null = null;
  
  for (const site of world.sites) {
    const dx = site.x - x;
    const dy = site.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (!nearest || distance < nearest.distance) {
      nearest = { site, distance };
    }
  }
  
  return nearest;
}

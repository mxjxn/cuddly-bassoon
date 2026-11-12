import { SeededRandom } from './random';
import type { World, Site, Road, HistoryEvent, Terrain } from './types';
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

export type GenerationPhase = 'terrain' | 'founding' | 'simulation' | 'complete';

export interface GenerationEvent {
  year: number;
  description: string;
  phase: GenerationPhase;
}

export interface GenerationState {
  phase: GenerationPhase;
  progress: number; // 0-1
  currentYear?: number;
  event?: GenerationEvent;
  world: Partial<World>;
}

export class WorldGenerator {
  private rng: SeededRandom;
  private seed: string;
  private width = 300;
  private height = 200;
  private startYear = 1850;
  private simulationYears = 80;
  
  private terrain: Terrain[][] = [];
  private sites: Site[] = [];
  private roads: Road[] = [];
  private history: HistoryEvent[] = [];
  private currentYear = this.startYear;
  private currentSimYear = 0;
  private usedNames = new Set<string>();
  
  private phase: GenerationPhase = 'terrain';

  constructor(seed: string) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
  }

  /**
   * Step through one increment of world generation.
   * Returns the current state with any events that occurred.
   */
  step(): GenerationState {
    switch (this.phase) {
      case 'terrain':
        return this.stepTerrain();
      case 'founding':
        return this.stepFounding();
      case 'simulation':
        return this.stepSimulation();
      case 'complete':
        return this.getCompleteState();
    }
  }

  isComplete(): boolean {
    return this.phase === 'complete';
  }

  getWorld(): World {
    const importantHistory = this.history
      .filter(h => h.importance >= 5)
      .slice(0, 50);
    
    const spawnSite = this.sites.find(s => s.type === 'commons' && s.active) || 
                      this.sites.find(s => s.active) || 
                      this.sites[0];
    
    const player = {
      position: {
        x: spawnSite.x + this.rng.nextInt(-2, 2),
        y: spawnSite.y + this.rng.nextInt(-2, 2)
      }
    };
    
    return {
      seed: this.seed,
      width: this.width,
      height: this.height,
      terrain: this.terrain,
      sites: this.sites,
      roads: this.roads.filter(r => r.strength > 0.3),
      history: importantHistory,
      player,
      currentYear: this.currentYear
    };
  }

  private stepTerrain(): GenerationState {
    this.terrain = generateTerrain(this.width, this.height, this.rng);
    this.phase = 'founding';
    
    return {
      phase: 'terrain',
      progress: 1.0,
      event: {
        year: this.startYear,
        description: 'The land takes shape: mountains rise, rivers flow, forests spread.',
        phase: 'terrain'
      },
      world: {
        seed: this.seed,
        width: this.width,
        height: this.height,
        terrain: this.terrain,
        sites: [],
        roads: [],
        history: [],
        currentYear: this.startYear
      }
    };
  }

  private foundingStep = 0;
  private foundingSteps = 4; // company-town, freeport, guild-city, commons

  private stepFounding(): GenerationState {
    let event: GenerationEvent | undefined;

    switch (this.foundingStep) {
      case 0:
        event = this.foundCompanyTowns();
        break;
      case 1:
        event = this.foundFreeports();
        break;
      case 2:
        event = this.foundGuildCities();
        break;
      case 3:
        event = this.foundCommons();
        break;
    }

    this.foundingStep++;
    const progress = this.foundingStep / this.foundingSteps;

    if (this.foundingStep >= this.foundingSteps) {
      this.phase = 'simulation';
      this.foundingStep = 0;
    }

    return {
      phase: 'founding',
      progress,
      event,
      world: {
        seed: this.seed,
        width: this.width,
        height: this.height,
        terrain: this.terrain,
        sites: [...this.sites],
        roads: [],
        history: [...this.history],
        currentYear: this.startYear
      }
    };
  }

  private foundCompanyTowns(): GenerationEvent {
    const numCompanyTowns = this.rng.nextInt(6, 10);
    let founded = 0;
    
    for (let i = 0; i < numCompanyTowns; i++) {
      const pos = findTerrainWithResource(this.terrain, 'ore', this.rng, this.sites);
      if (pos) {
        const name = getUnusedSiteName('company-town', this.usedNames, this.rng);
        this.usedNames.add(name);
        
        const site: Site = {
          id: `site-${this.sites.length}`,
          type: 'company-town',
          name,
          x: pos.x,
          y: pos.y,
          radius: this.rng.nextInt(5, 8),
          foundedYear: this.startYear + this.rng.nextInt(0, 10),
          population: this.rng.nextInt(80, 150),
          active: true,
          resources: {
            ore: 1,
            timber: this.terrain[pos.y][pos.x].resources.includes('timber') ? 1 : 0,
            farmland: 0,
            harbor: 0
          },
          production: {},
          needs: {},
          constructions: []
        };
        
        setupSiteProduction(site);
        this.sites.push(site);
        
        this.history.push({
          year: site.foundedYear,
          description: `The Company chartered ${name} after discovering rich ore deposits. Workers flooded in seeking wages.`,
          siteId: site.id,
          importance: 7
        });
        founded++;
      }
    }
    
    return {
      year: this.startYear,
      description: `${founded} company towns founded on rich ore deposits, offering wages in exchange for labor.`,
      phase: 'founding'
    };
  }

  private foundFreeports(): GenerationEvent {
    const numFreeports = this.rng.nextInt(3, 6);
    let founded = 0;
    
    for (let i = 0; i < numFreeports; i++) {
      const pos = findTerrainWithResource(this.terrain, 'harbor', this.rng, this.sites);
      if (pos) {
        const name = getUnusedSiteName('freeport', this.usedNames, this.rng);
        this.usedNames.add(name);
        
        const site: Site = {
          id: `site-${this.sites.length}`,
          type: 'freeport',
          name,
          x: pos.x,
          y: pos.y,
          radius: this.rng.nextInt(4, 7),
          foundedYear: this.startYear + this.rng.nextInt(0, 15),
          population: this.rng.nextInt(60, 120),
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
        this.sites.push(site);
        
        this.history.push({
          year: site.foundedYear,
          description: `${name} was established as a neutral trading port, beyond Company control.`,
          siteId: site.id,
          importance: 6
        });
        founded++;
      }
    }
    
    return {
      year: this.startYear,
      description: `${founded} freeports established on natural harbors, living on trade beyond Company control.`,
      phase: 'founding'
    };
  }

  private foundGuildCities(): GenerationEvent {
    const numGuildCities = this.rng.nextInt(3, 5);
    let founded = 0;
    
    for (let i = 0; i < numGuildCities; i++) {
      const pos = findTerrainWithResource(this.terrain, 'timber', this.rng, this.sites);
      if (pos) {
        const name = getUnusedSiteName('guild-city', this.usedNames, this.rng);
        this.usedNames.add(name);
        
        const site: Site = {
          id: `site-${this.sites.length}`,
          type: 'guild-city',
          name,
          x: pos.x,
          y: pos.y,
          radius: this.rng.nextInt(4, 6),
          foundedYear: this.startYear + this.rng.nextInt(0, 20),
          population: this.rng.nextInt(50, 100),
          active: true,
          resources: {
            ore: this.terrain[pos.y][pos.x].resources.includes('ore') ? 1 : 0,
            timber: 1,
            farmland: 0,
            harbor: 0
          },
          production: {},
          needs: {},
          constructions: []
        };
        
        setupSiteProduction(site);
        this.sites.push(site);
        
        this.history.push({
          year: site.foundedYear,
          description: `Master artisans founded ${name} to preserve their crafts outside corporate hierarchy.`,
          siteId: site.id,
          importance: 6
        });
        founded++;
      }
    }
    
    return {
      year: this.startYear,
      description: `${founded} guild cities founded near timber and materials, preserving craft traditions.`,
      phase: 'founding'
    };
  }

  private foundCommons(): GenerationEvent {
    const numCommons = this.rng.nextInt(2, 4);
    let founded = 0;
    
    for (let i = 0; i < numCommons; i++) {
      const pos = findTerrainWithResource(this.terrain, 'farmland', this.rng, this.sites);
      if (pos) {
        const name = getUnusedSiteName('commons', this.usedNames, this.rng);
        this.usedNames.add(name);
        
        const site: Site = {
          id: `site-${this.sites.length}`,
          type: 'commons',
          name,
          x: pos.x,
          y: pos.y,
          radius: 3,
          foundedYear: this.startYear + this.rng.nextInt(5, 25),
          population: this.rng.nextInt(20, 40),
          active: true,
          resources: {
            ore: 0,
            timber: this.terrain[pos.y][pos.x].resources.includes('timber') ? 1 : 0,
            farmland: 1,
            harbor: 0
          },
          production: {},
          needs: {},
          constructions: []
        };
        
        setupSiteProduction(site);
        this.sites.push(site);
        
        this.history.push({
          year: site.foundedYear,
          description: `${name} emerged as people built mutual aid networks outside the wage system.`,
          siteId: site.id,
          importance: 5
        });
        founded++;
      }
    }
    
    return {
      year: this.startYear,
      description: `${founded} commons emerged on farmland, building mutual aid outside the wage system.`,
      phase: 'founding'
    };
  }

  private stepSimulation(): GenerationState {
    this.currentYear = this.startYear + this.currentSimYear;
    const events: GenerationEvent[] = [];
    
    // Simulate one year
    for (const site of this.sites) {
      if (!site.active) continue;
      
      for (const [need] of Object.entries(site.needs)) {
        const partner = findTradingPartner(site, this.sites, need);
        if (partner) {
          const road = createRoad(site, partner, 'trade', this.terrain, this.roads);
          if (road && this.currentSimYear % 5 === 0 && this.rng.next() > 0.7) {
            events.push({
              year: this.currentYear,
              description: `Trade route established between ${site.name} and ${partner.name}, carrying ${need}.`,
              phase: 'simulation'
            });
            this.history.push({
              year: this.currentYear,
              description: `Trade route established between ${site.name} and ${partner.name}, carrying ${need}.`,
              siteId: site.id,
              roadId: road.id,
              importance: 4
            });
          }
        }
      }
      
      if (site.type === 'commons' && this.rng.next() > 0.9) {
        const nearbyFailed = this.sites.find(s => 
          s.type === 'failed-charter' && 
          Math.hypot(s.x - site.x, s.y - site.y) < 30
        );
        
        if (nearbyFailed) {
          const road = createRoad(site, nearbyFailed, 'share', this.terrain, this.roads);
          if (road && this.rng.next() > 0.8) {
            events.push({
              year: this.currentYear,
              description: `${site.name} extended a share route to aid survivors in ${nearbyFailed.name}.`,
              phase: 'simulation'
            });
            this.history.push({
              year: this.currentYear,
              description: `${site.name} extended a share route to aid survivors in ${nearbyFailed.name}.`,
              siteId: site.id,
              roadId: road.id,
              importance: 6
            });
          }
        }
      }
    }
    
    // Construction
    if (this.currentSimYear % 3 === 0) {
      for (const site of this.sites) {
        if (!site.active) continue;
        
        const construction = attemptSiteConstruction(site, this.roads);
        if (construction) {
          if (addConstruction(site, construction)) {
            if (this.rng.next() > 0.7) {
              events.push({
                year: this.currentYear,
                description: `${site.name} completed construction of a ${construction.replace('-', ' ')}.`,
                phase: 'simulation'
              });
              this.history.push({
                year: this.currentYear,
                description: `${site.name} completed construction of a ${construction.replace('-', ' ')}.`,
                siteId: site.id,
                importance: 3
              });
            }
          }
        }
      }
    }
    
    // Failures and commons formation
    if (this.currentSimYear % 8 === 0) {
      for (const site of this.sites) {
        if (!site.active) continue;
        
        if (checkSiteFailure(site, this.roads, this.rng)) {
          const event = failSite(site, this.currentYear);
          events.push({
            year: this.currentYear,
            description: event.description,
            phase: 'simulation'
          });
          this.history.push(event);
          
          const commonsResult = attemptCommonsFormation(this.sites, site, this.terrain, this.currentYear + 1, this.rng);
          if (commonsResult) {
            this.sites.push(commonsResult.site);
            events.push({
              year: this.currentYear + 1,
              description: commonsResult.event.description,
              phase: 'simulation'
            });
            this.history.push(commonsResult.event);
          }
        }
      }
    }
    
    decayRoads(this.roads, 0.05);
    
    if (this.currentSimYear % 10 === 0) {
      const beforeCount = this.roads.length;
      const cleaned = removeDeadRoads(this.roads);
      const removed = beforeCount - cleaned.length;
      
      if (removed > 0) {
        this.roads.length = 0;
        this.roads.push(...cleaned);
      }
    }
    
    this.currentSimYear++;
    const progress = this.currentSimYear / this.simulationYears;
    
    if (this.currentSimYear >= this.simulationYears) {
      this.phase = 'complete';
      this.history.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return b.importance - a.importance;
      });
    }
    
    // Return the most important event if any
    const event = events.length > 0 ? events[0] : undefined;
    
    return {
      phase: 'simulation',
      progress,
      currentYear: this.currentYear,
      event,
      world: {
        seed: this.seed,
        width: this.width,
        height: this.height,
        terrain: this.terrain,
        sites: [...this.sites],
        roads: this.roads.filter(r => r.strength > 0.3),
        history: [...this.history],
        currentYear: this.currentYear
      }
    };
  }

  private getCompleteState(): GenerationState {
    return {
      phase: 'complete',
      progress: 1.0,
      world: {
        seed: this.seed,
        width: this.width,
        height: this.height,
        terrain: this.terrain,
        sites: this.sites,
        roads: this.roads.filter(r => r.strength > 0.3),
        history: this.history.filter(h => h.importance >= 5).slice(0, 50),
        currentYear: this.currentYear
      }
    };
  }
}

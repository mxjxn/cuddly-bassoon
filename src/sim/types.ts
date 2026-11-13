export type SiteType = 'company-town' | 'freeport' | 'guild-city' | 'failed-charter' | 'commons';
export type BiomeType = 'forest' | 'plains' | 'hills' | 'mountains' | 'water' | 'coast';
export type ResourceType = 'ore' | 'timber' | 'farmland' | 'harbor';
export type RoadType = 'trade' | 'share';
export type ConstructionType = 'company-store' | 'warehouse' | 'dock' | 'workshop' | 'pantry' | 'grid';

export interface Position {
  x: number;
  y: number;
}

export interface Terrain {
  height: number;
  biome: BiomeType;
  resources: ResourceType[];
}

export interface Site {
  id: string;
  type: SiteType;
  name: string;
  x: number;
  y: number;
  radius: number;
  foundedYear: number;
  population: number;
  active: boolean;
  resources: Record<ResourceType, number>;
  production: Partial<Record<'ore' | 'timber' | 'food' | 'goods' | 'tools', number>>;
  needs: Partial<Record<'ore' | 'timber' | 'food' | 'goods' | 'tools', number>>;
  constructions: ConstructionType[];
}

export interface Road {
  id: string;
  type: RoadType;
  from: string;
  to: string;
  strength: number;
  path: Position[];
}

export interface Player {
  position: Position;
}

export interface HistoryEvent {
  year: number;
  description: string;
  siteId?: string;
  roadId?: string;
  importance: number;
}

export interface World {
  seed: string;
  width: number;
  height: number;
  terrain: Terrain[][];
  sites: Site[];
  roads: Road[];
  history: HistoryEvent[];
  player: Player;
  currentYear: number;
}

export type BuildingType = 
  | 'company-store' 
  | 'mill' 
  | 'cannery'
  | 'barracks' 
  | 'company-housing'
  | 'dock' 
  | 'market' 
  | 'warehouse'
  | 'guild-hall' 
  | 'workshop'
  | 'residence'
  | 'pantry' 
  | 'library'
  | 'bar'
  | 'venue'
  | 'ruin';

export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doorX?: number;
  doorY?: number;
  isRuined?: boolean;
}

export interface Town {
  siteId: string;
  width: number;
  height: number;
  buildings: Building[];
  streets: Position[];
  entryPoints: Position[];
}

import type { SiteType, BiomeType, RoadType } from '../sim/types';

export const SITE_COLORS: Record<SiteType, string> = {
  'company-town': '#8B4513',
  'freeport': '#4682B4',
  'guild-city': '#DAA520',
  'failed-charter': '#696969',
  'commons': '#228B22'
};

export const SITE_GLYPHS: Record<SiteType, string> = {
  'company-town': '■',
  'freeport': '◆',
  'guild-city': '●',
  'failed-charter': '▢',
  'commons': '✦'
};

export const BIOME_COLORS: Record<BiomeType, string> = {
  'water': '#1e3a5f',
  'coast': '#8b7355',
  'plains': '#3a5f3a',
  'forest': '#2d4a2d',
  'hills': '#5a4a3a',
  'mountains': '#6a6a6a'
};

export const ROAD_COLORS: Record<RoadType, string> = {
  'trade': '#d4a574',
  'share': '#7fb685'
};

export const PLAYER_COLOR = '#FFD700';
export const GRID_COLOR = '#0f0f0f';

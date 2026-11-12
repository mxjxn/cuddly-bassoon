// IBM/ANSI 16-color VGA palette
export const ANSI_COLORS = {
  // Standard colors (0-7)
  black: '#000000',
  red: '#aa0000',
  green: '#00aa00',
  yellow: '#aa5500',
  blue: '#0000aa',
  magenta: '#aa00aa',
  cyan: '#00aaaa',
  white: '#aaaaaa',
  
  // Bright colors (8-15)
  brightBlack: '#555555',
  brightRed: '#ff5555',
  brightGreen: '#55ff55',
  brightYellow: '#ffff55',
  brightBlue: '#5555ff',
  brightMagenta: '#ff55ff',
  brightCyan: '#55ffff',
  brightWhite: '#ffffff'
} as const;

export type AnsiColor = keyof typeof ANSI_COLORS;

// Terrain colors (background + glyph)
export const TERRAIN_STYLES = {
  water: { bg: ANSI_COLORS.blue, fg: ANSI_COLORS.brightBlue, char: '≈' },
  coast: { bg: ANSI_COLORS.yellow, fg: ANSI_COLORS.brightYellow, char: '~' },
  plains: { bg: ANSI_COLORS.green, fg: ANSI_COLORS.brightGreen, char: '"' },
  forest: { bg: ANSI_COLORS.green, fg: ANSI_COLORS.brightGreen, char: '♣' },
  hills: { bg: ANSI_COLORS.yellow, fg: ANSI_COLORS.brightYellow, char: 'n' },
  mountains: { bg: ANSI_COLORS.brightBlack, fg: ANSI_COLORS.white, char: '▲' }
} as const;

// Road colors (foreground only, drawn over terrain)
export const ROAD_STYLES = {
  trade: ANSI_COLORS.brightYellow,
  share: ANSI_COLORS.brightGreen
} as const;

// Site glyphs and colors
export const SITE_STYLES = {
  'company-town': { fg: ANSI_COLORS.yellow, char: '■' },
  'freeport': { fg: ANSI_COLORS.brightCyan, char: '◆' },
  'guild-city': { fg: ANSI_COLORS.brightYellow, char: '●' },
  'failed-charter': { fg: ANSI_COLORS.brightBlack, char: '▢' },
  'commons': { fg: ANSI_COLORS.brightGreen, char: '✦' }
} as const;

export const PLAYER_STYLE = {
  fg: ANSI_COLORS.brightWhite,
  bg: ANSI_COLORS.black,
  char: '@'
} as const;

// Box-drawing character selection based on connectivity
// Returns the appropriate CP437 box-drawing character

interface ConnectivityMask {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export function getBoxDrawingChar(connectivity: ConnectivityMask): string {
  const { north, south, east, west } = connectivity;
  
  // Count connections
  const connections = [north, south, east, west].filter(Boolean).length;
  
  if (connections === 0) {
    return '·';
  }
  
  if (connections === 1) {
    // Dead ends - use line segments
    if (north) return '│';
    if (south) return '│';
    if (east) return '─';
    if (west) return '─';
  }
  
  if (connections === 2) {
    // Straight lines
    if (north && south) return '│';
    if (east && west) return '─';
    
    // Corners
    if (north && east) return '└';
    if (north && west) return '┘';
    if (south && east) return '┌';
    if (south && west) return '┐';
  }
  
  if (connections === 3) {
    // T-junctions
    if (!north) return '┬';
    if (!south) return '┴';
    if (!east) return '┤';
    if (!west) return '├';
  }
  
  if (connections === 4) {
    // Four-way intersection
    return '┼';
  }
  
  return '·';
}

// Helper to build a map of road tiles with their connectivity
export function buildRoadConnectivity(
  roads: Array<{ path: Array<{ x: number; y: number }> }>
): Map<string, ConnectivityMask> {
  const roadTiles = new Map<string, Set<string>>();
  
  // First pass: collect all road segments
  for (const road of roads) {
    for (let i = 0; i < road.path.length; i++) {
      const curr = road.path[i];
      const key = `${curr.x},${curr.y}`;
      
      if (!roadTiles.has(key)) {
        roadTiles.set(key, new Set());
      }
      
      // Add neighbors that are part of this road
      if (i > 0) {
        const prev = road.path[i - 1];
        roadTiles.get(key)!.add(`${prev.x},${prev.y}`);
      }
      if (i < road.path.length - 1) {
        const next = road.path[i + 1];
        roadTiles.get(key)!.add(`${next.x},${next.y}`);
      }
    }
  }
  
  // Second pass: build connectivity masks
  const connectivity = new Map<string, ConnectivityMask>();
  
  for (const [key, neighbors] of roadTiles) {
    const [x, y] = key.split(',').map(Number);
    
    connectivity.set(key, {
      north: neighbors.has(`${x},${y - 1}`),
      south: neighbors.has(`${x},${y + 1}`),
      east: neighbors.has(`${x + 1},${y}`),
      west: neighbors.has(`${x - 1},${y}`)
    });
  }
  
  return connectivity;
}

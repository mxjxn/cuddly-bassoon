import type { Terrain, Position } from './types';
import { getTerrainDifficulty } from './terrain';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export function findPath(
  terrain: Terrain[][],
  start: Position,
  end: Position
): Position[] | null {
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  
  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: 0,
    parent: null
  };
  startNode.f = startNode.g + startNode.h;
  
  openSet.push(startNode);
  
  const height = terrain.length;
  const width = terrain[0].length;
  
  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    if (current.x === end.x && current.y === end.y) {
      return reconstructPath(current);
    }
    
    closedSet.add(`${current.x},${current.y}`);
    
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
      { x: current.x + 1, y: current.y + 1 },
      { x: current.x + 1, y: current.y - 1 },
      { x: current.x - 1, y: current.y + 1 },
      { x: current.x - 1, y: current.y - 1 }
    ];
    
    for (const neighbor of neighbors) {
      if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) {
        continue;
      }
      
      const key = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(key)) continue;
      
      const difficulty = getTerrainDifficulty(terrain, neighbor.x, neighbor.y);
      if (difficulty === Infinity) continue;
      
      const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
      const moveCost = (isDiagonal ? 1.414 : 1) * difficulty;
      const g = current.g + moveCost;
      
      const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
      
      if (!existingNode) {
        const newNode: PathNode = {
          x: neighbor.x,
          y: neighbor.y,
          g,
          h: heuristic(neighbor, end),
          f: 0,
          parent: current
        };
        newNode.f = newNode.g + newNode.h;
        openSet.push(newNode);
      } else if (g < existingNode.g) {
        existingNode.g = g;
        existingNode.f = existingNode.g + existingNode.h;
        existingNode.parent = current;
      }
    }
    
    if (closedSet.size > 2000) {
      return null;
    }
  }
  
  return null;
}

function heuristic(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy;
}

function reconstructPath(node: PathNode): Position[] {
  const path: Position[] = [];
  let current: PathNode | null = node;
  
  while (current) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  
  return simplifyPath(path);
}

function simplifyPath(path: Position[]): Position[] {
  if (path.length <= 2) return path;
  
  const simplified: Position[] = [path[0]];
  
  for (let i = 1; i < path.length - 1; i += 3) {
    simplified.push(path[i]);
  }
  
  simplified.push(path[path.length - 1]);
  return simplified;
}

import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { getSiteAtPosition, getNearestSite } from '../sim/worldgen';
import { generateTown } from '../sim/towngen';
import { createCamera, render } from '../render/renderer';
import { getBuildingAtPosition } from '../render/town';
import type { World, Town, Building } from '../sim/types';
import type { Camera, ViewMode } from '../render/types';
import { Controls } from './Controls';
import { HistoryPanel } from './HistoryPanel';
import { HUD } from './HUD';
import { WorldGeneration } from './WorldGeneration';

type GameState = 'generating' | 'playing';

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('generating');
  const [world, setWorld] = useState<World | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('topdown');
  const [seed, setSeed] = useState<string>(generateRandomSeed());
  const cameraRef = useRef<Camera>(createCamera(0, 0));
  const keysRef = useRef<Set<string>>(new Set());
  const [currentTown, setCurrentTown] = useState<Town | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const townCacheRef = useRef<Map<string, Town>>(new Map());

  function generateRandomSeed(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  const handleGenerationComplete = useCallback((newWorld: World) => {
    setWorld(newWorld);
    cameraRef.current = createCamera(newWorld.player.position.x, newWorld.player.position.y);
    setGameState('playing');
  }, []);

  const zoomIntoSite = useCallback((siteId: string) => {
    if (!world) return;
    
    const site = world.sites.find(s => s.id === siteId);
    if (!site) return;
    
    let town = townCacheRef.current.get(siteId);
    if (!town) {
      town = generateTown(site, world.seed);
      townCacheRef.current.set(siteId, town);
    }
    
    setCurrentTown(town);
    cameraRef.current = {
      x: Math.floor(town.width / 2),
      y: Math.floor(town.height / 2),
      zoom: 1,
      zoomLevel: 'town',
      currentSiteId: siteId
    };
  }, [world]);

  const zoomOutToWorld = useCallback(() => {
    if (!world) return;
    
    setCurrentTown(null);
    setHoveredBuilding(null);
    cameraRef.current = {
      x: world.player.position.x,
      y: world.player.position.y,
      zoom: 1,
      zoomLevel: 'world'
    };
  }, [world]);

  useEffect(() => {
    if (!world) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      keysRef.current.add(e.key.toLowerCase());
      
      if (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'enter') {
        e.preventDefault();
        if (cameraRef.current.zoomLevel === 'world') {
          const currentSite = getSiteAtPosition(world, world.player.position.x, world.player.position.y);
          if (currentSite) {
            zoomIntoSite(currentSite.id);
          }
        } else {
          zoomOutToWorld();
        }
      }
      
      if (e.key === 'Escape' && cameraRef.current.zoomLevel === 'town') {
        e.preventDefault();
        zoomOutToWorld();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [world, zoomIntoSite, zoomOutToWorld]);

  useEffect(() => {
    if (!canvasRef.current || !world) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      if (cameraRef.current.zoomLevel !== 'town' || !currentTown) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const TILE_SIZE = 12;
      const worldX = Math.floor((mouseX - canvas.width / 2) / TILE_SIZE + cameraRef.current.x);
      const worldY = Math.floor((mouseY - canvas.height / 2) / TILE_SIZE + cameraRef.current.y);

      const building = getBuildingAtPosition(currentTown, worldX, worldY);
      setHoveredBuilding(building);
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    let lastTime = performance.now();
    let animationId: number;

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (cameraRef.current.zoomLevel === 'world') {
        let dx = 0;
        let dy = 0;
        const speed = 15;

        if (keysRef.current.has('w') || keysRef.current.has('arrowup')) dy -= 1;
        if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) dy += 1;
        if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) dx -= 1;
        if (keysRef.current.has('d') || keysRef.current.has('arrowright')) dx += 1;

        if (dx !== 0 || dy !== 0) {
          const length = Math.sqrt(dx * dx + dy * dy);
          dx = (dx / length) * speed * deltaTime;
          dy = (dy / length) * speed * deltaTime;

          const newX = Math.max(0, Math.min(world.width - 1, world.player.position.x + dx));
          const newY = Math.max(0, Math.min(world.height - 1, world.player.position.y + dy));

          setWorld(prev => prev ? {
            ...prev,
            player: {
              position: { x: newX, y: newY }
            }
          } : null);
        }

        cameraRef.current.x = world.player.position.x;
        cameraRef.current.y = world.player.position.y;
      } else if (cameraRef.current.zoomLevel === 'town' && currentTown) {
        let dx = 0;
        let dy = 0;
        const speed = 20;

        if (keysRef.current.has('w') || keysRef.current.has('arrowup')) dy -= 1;
        if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) dy += 1;
        if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) dx -= 1;
        if (keysRef.current.has('d') || keysRef.current.has('arrowright')) dx += 1;

        if (dx !== 0 || dy !== 0) {
          const length = Math.sqrt(dx * dx + dy * dy);
          dx = (dx / length) * speed * deltaTime;
          dy = (dy / length) * speed * deltaTime;

          cameraRef.current.x = Math.max(0, Math.min(currentTown.width - 1, cameraRef.current.x + dx));
          cameraRef.current.y = Math.max(0, Math.min(currentTown.height - 1, cameraRef.current.y + dy));
        }
      }

      render(world, ctx, cameraRef.current, viewMode, currentTown || undefined, hoveredBuilding);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [world, viewMode, currentTown, hoveredBuilding]);

  const handleNewWorld = () => {
    const newSeed = generateRandomSeed();
    setSeed(newSeed);
    setWorld(null);
    setCurrentTown(null);
    setHoveredBuilding(null);
    townCacheRef.current.clear();
    setGameState('generating');
  };

  const handleToggleView = () => {
    if (cameraRef.current.zoomLevel === 'world') {
      setViewMode(prev => prev === 'topdown' ? 'isometric' : 'topdown');
    }
  };

  if (gameState === 'generating') {
    return <WorldGeneration seed={seed} viewMode={viewMode} onComplete={handleGenerationComplete} />;
  }

  if (!world) {
    return <div class="loading">Initializing...</div>;
  }

  const currentSite = getSiteAtPosition(world, world.player.position.x, world.player.position.y);
  const nearestInfo = getNearestSite(world, world.player.position.x, world.player.position.y);
  
  const isInTownView = cameraRef.current.zoomLevel === 'town';
  const townSite = isInTownView && cameraRef.current.currentSiteId 
    ? world.sites.find(s => s.id === cameraRef.current.currentSiteId)
    : null;

  return (
    <div class="game-container">
      <div class="game-header">
        <h1>Unnamed Sandbox</h1>
        <Controls 
          seed={seed}
          viewMode={viewMode}
          onNewWorld={handleNewWorld}
          onToggleView={handleToggleView}
        />
      </div>
      
      <div class="game-main">
        <div class="canvas-container">
          <canvas ref={canvasRef} />
        </div>
        
        <HistoryPanel history={world.history} />
      </div>

      <HUD 
        position={world.player.position}
        currentSite={currentSite}
        nearestSite={nearestInfo}
        viewMode={viewMode}
        zoomLevel={cameraRef.current.zoomLevel}
        townSite={townSite || undefined}
        hoveredBuilding={hoveredBuilding || undefined}
      />
    </div>
  );
}

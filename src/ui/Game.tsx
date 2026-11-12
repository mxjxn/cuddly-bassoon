import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { getSiteAtPosition, getNearestSite } from '../sim/worldgen';
import { createCamera, render } from '../render/renderer';
import type { World } from '../sim/types';
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

  function generateRandomSeed(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  const handleGenerationComplete = useCallback((newWorld: World) => {
    setWorld(newWorld);
    cameraRef.current = createCamera(newWorld.player.position.x, newWorld.player.position.y);
    setGameState('playing');
  }, []);

  useEffect(() => {
    if (!world) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      keysRef.current.add(e.key.toLowerCase());
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
  }, [world]);

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

    let lastTime = performance.now();
    let animationId: number;

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

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

      render(world, ctx, cameraRef.current, viewMode);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [world, viewMode]);

  const handleNewWorld = () => {
    const newSeed = generateRandomSeed();
    setSeed(newSeed);
    setWorld(null);
    setGameState('generating');
  };

  const handleToggleView = () => {
    setViewMode(prev => prev === 'topdown' ? 'isometric' : 'topdown');
  };

  if (gameState === 'generating') {
    return <WorldGeneration seed={seed} viewMode={viewMode} onComplete={handleGenerationComplete} />;
  }

  if (!world) {
    return <div class="loading">Initializing...</div>;
  }

  const currentSite = getSiteAtPosition(world, world.player.position.x, world.player.position.y);
  const nearestInfo = getNearestSite(world, world.player.position.x, world.player.position.y);

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
      />
    </div>
  );
}

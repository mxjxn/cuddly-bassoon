import { useEffect, useRef, useState } from 'preact/hooks';
import { WorldGenerator, type GenerationEvent } from '../sim/worldgenStepper';
import { createCamera, render } from '../render/renderer';
import type { World } from '../sim/types';
import type { Camera, ViewMode } from '../render/types';

interface WorldGenerationProps {
  seed: string;
  viewMode: ViewMode;
  onComplete: (world: World) => void;
}

export function WorldGeneration({ seed, viewMode, onComplete }: WorldGenerationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generatorRef = useRef<WorldGenerator | null>(null);
  const cameraRef = useRef<Camera>(createCamera(150, 100));
  const [events, setEvents] = useState<GenerationEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>('Terrain');
  const [progress, setProgress] = useState(0);
  const [isSkipping, setIsSkipping] = useState(false);
  const eventLogRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    generatorRef.current = new WorldGenerator(seed);
    
    // Initial step
    const state = generatorRef.current.step();
    if (state.event) {
      setEvents([state.event]);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [seed]);

  useEffect(() => {
    if (!canvasRef.current) return;

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

    let lastStepTime = 0;
    const stepInterval = isSkipping ? 0 : 50; // 50ms per step when not skipping

    const animate = (currentTime: number) => {
      if (!generatorRef.current) return;

      const generator = generatorRef.current;
      
      // Step the generator
      if (currentTime - lastStepTime >= stepInterval) {
        if (!generator.isComplete()) {
          const state = generator.step();
          
          if (state.event) {
            setEvents(prev => [...prev, state.event!]);
          }
          
          setCurrentPhase(getPhaseLabel(state.phase));
          setProgress(state.progress);
          
          // Render the current state
          if (state.world.terrain && state.world.sites) {
            const partialWorld: Partial<World> = {
              ...state.world,
              player: { position: { x: 150, y: 100 } }
            };
            
            if (isPartialWorldRenderable(partialWorld)) {
              render(partialWorld as World, ctx, cameraRef.current, viewMode);
            }
          }
          
          lastStepTime = currentTime;
        } else {
          // Generation complete
          const world = generator.getWorld();
          render(world, ctx, cameraRef.current, viewMode);
          onComplete(world);
          return;
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [viewMode, isSkipping, onComplete]);

  // Auto-scroll event log
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events]);

  const handleSkip = () => {
    setIsSkipping(true);
  };

  const handleFinish = () => {
    if (generatorRef.current) {
      // Fast-forward to completion
      while (!generatorRef.current.isComplete()) {
        const state = generatorRef.current.step();
        if (state.event) {
          setEvents(prev => [...prev, state.event!]);
        }
      }
      
      const world = generatorRef.current.getWorld();
      onComplete(world);
    }
  };

  return (
    <div class="worldgen-container">
      <div class="worldgen-header">
        <h2>World Generation</h2>
        <div class="worldgen-controls">
          <button onClick={handleSkip} disabled={isSkipping}>
            {isSkipping ? 'Fast-forwarding...' : 'Skip Animation'}
          </button>
          <button onClick={handleFinish}>Finish Now</button>
        </div>
      </div>
      
      <div class="worldgen-main">
        <div class="worldgen-canvas-container">
          <canvas ref={canvasRef} />
          <div class="worldgen-progress">
            <div class="progress-label">{currentPhase}</div>
            <div class="progress-bar">
              <div class="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>
        
        <div class="worldgen-log" ref={eventLogRef}>
          <h3>History Unfolding</h3>
          {events.map((event, i) => (
            <div key={i} class="worldgen-event">
              <span class="event-year">{event.year}</span>
              <span class="event-description">{event.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'terrain': return 'Shaping the Land';
    case 'founding': return 'Founding Settlements';
    case 'simulation': return 'History Unfolds';
    case 'complete': return 'Complete';
    default: return phase;
  }
}

function isPartialWorldRenderable(world: Partial<World>): world is World {
  return !!(
    world.seed &&
    world.width &&
    world.height &&
    world.terrain &&
    world.sites &&
    world.roads !== undefined &&
    world.history &&
    world.player &&
    world.currentYear !== undefined
  );
}

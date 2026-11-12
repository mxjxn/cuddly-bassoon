import type { ViewMode } from '../render/types';

interface ControlsProps {
  seed: string;
  viewMode: ViewMode;
  onNewWorld: () => void;
  onToggleView: () => void;
}

export function Controls({ seed, viewMode, onNewWorld, onToggleView }: ControlsProps) {
  return (
    <div class="controls">
      <div class="control-group">
        <label>Seed:</label>
        <span class="seed-display">{seed}</span>
      </div>
      
      <button onClick={onNewWorld} class="btn">
        New World
      </button>
      
      <button onClick={onToggleView} class="btn">
        View: {viewMode === 'topdown' ? 'Top-Down' : 'Isometric'}
      </button>
    </div>
  );
}

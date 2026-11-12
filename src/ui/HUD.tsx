import type { Position, Site } from '../sim/types';
import type { ViewMode } from '../render/types';

interface HUDProps {
  position: Position;
  currentSite: Site | null;
  nearestSite: { site: Site; distance: number } | null;
  viewMode: ViewMode;
}

export function HUD({ position, currentSite, nearestSite, viewMode }: HUDProps) {
  return (
    <div class="hud">
      <div class="hud-item">
        <strong>Position:</strong> ({position.x.toFixed(1)}, {position.y.toFixed(1)})
      </div>
      
      <div class="hud-item">
        <strong>Location:</strong> {
          currentSite 
            ? `In ${currentSite.name} (${currentSite.type})` 
            : nearestSite && nearestSite.distance < 15
              ? `Near ${nearestSite.site.name} (${nearestSite.distance.toFixed(1)} tiles)`
              : 'Wilderness'
        }
      </div>
      
      <div class="hud-item">
        <strong>View:</strong> {viewMode === 'topdown' ? 'Top-Down' : 'Isometric'}
      </div>

      <div class="hud-hint">
        Use WASD or Arrow Keys to move
      </div>
    </div>
  );
}

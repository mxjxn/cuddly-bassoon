import type { Position, Site, Building } from '../sim/types';
import type { ViewMode, ZoomLevel } from '../render/types';

interface HUDProps {
  position: Position;
  currentSite: Site | null;
  nearestSite: { site: Site; distance: number } | null;
  viewMode: ViewMode;
  zoomLevel: ZoomLevel;
  townSite?: Site;
  hoveredBuilding?: Building;
}

export function HUD({ position, currentSite, nearestSite, viewMode, zoomLevel, townSite, hoveredBuilding }: HUDProps) {
  return (
    <div class="hud">
      {zoomLevel === 'world' ? (
        <>
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
            Use WASD or Arrow Keys to move • {currentSite ? 'Press Z or Enter to zoom into site' : ''}
          </div>
        </>
      ) : (
        <>
          <div class="hud-item">
            <strong>Town:</strong> {townSite ? `${townSite.name} (${townSite.type})` : 'Unknown'}
          </div>
          
          {hoveredBuilding && (
            <div class="hud-item">
              <strong>Building:</strong> {hoveredBuilding.name}
            </div>
          )}
          
          <div class="hud-item">
            <strong>Population:</strong> {townSite?.population || 0}
          </div>

          <div class="hud-hint">
            Use WASD or Arrow Keys to pan • Press ESC or Z to return to world map
          </div>
        </>
      )}
    </div>
  );
}

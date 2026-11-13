import type { World, Town, Building } from '../sim/types';
import type { RenderContext, Camera, ViewMode } from './types';
import { renderTopDown } from './topdown';
import { renderIsometric } from './isometric';
import { renderTown } from './town';

export function createCamera(x: number, y: number): Camera {
  return { x, y, zoom: 1, zoomLevel: 'world' };
}

export function render(
  world: World,
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  viewMode: ViewMode,
  town?: Town,
  hoveredBuilding?: Building | null,
  animTime?: number
): void {
  const canvas = ctx.canvas;
  const context: RenderContext = { ctx, camera, viewMode, canvas };

  if (camera.zoomLevel === 'town' && town) {
    renderTown(world, town, context, hoveredBuilding || null, animTime);
  } else if (viewMode === 'topdown') {
    renderTopDown(world, context);
  } else {
    renderIsometric(world, context);
  }
}

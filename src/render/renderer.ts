import type { World } from '../sim/types';
import type { RenderContext, Camera, ViewMode } from './types';
import { renderTopDown } from './topdown';
import { renderIsometric } from './isometric';

export function createCamera(x: number, y: number): Camera {
  return { x, y, zoom: 1 };
}

export function render(world: World, ctx: CanvasRenderingContext2D, camera: Camera, viewMode: ViewMode): void {
  const canvas = ctx.canvas;
  const context: RenderContext = { ctx, camera, viewMode, canvas };

  if (viewMode === 'topdown') {
    renderTopDown(world, context);
  } else {
    renderIsometric(world, context);
  }
}

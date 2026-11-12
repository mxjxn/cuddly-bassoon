export type ViewMode = 'topdown' | 'isometric';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  viewMode: ViewMode;
  canvas: HTMLCanvasElement;
}

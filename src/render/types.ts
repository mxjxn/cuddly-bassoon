export type ViewMode = 'topdown' | 'isometric';
export type ZoomLevel = 'world' | 'town';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  zoomLevel: ZoomLevel;
  currentSiteId?: string;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  viewMode: ViewMode;
  canvas: HTMLCanvasElement;
}

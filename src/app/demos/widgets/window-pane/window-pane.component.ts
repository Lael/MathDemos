import {AfterViewInit, Component, ElementRef, Input, ViewChild} from '@angular/core';
import {Shader} from "../../../../graphics/gl/shader";
import {Scene} from "../../../../graphics/scene";
import {Vector4} from "three";
import {Framebuffer} from "../../../../graphics/gl/framebuffer";
import {Drawable} from "../../../../graphics/shapes/drawable";
import {Camera} from "../../../../graphics/camera/camera";
import {PerspectiveCamera} from "../../../../graphics/camera/perspective-camera";

export interface Selectable {
  id: number;
  uId: Vector4;

  drawable?: Drawable;
  mouseDown(x: number, y: number): void;
  mouseMove(x: number, y: number): void;
  mouseUp(x: number, y: number): void;
}

@Component({
  selector: 'app-window-pane',
  templateUrl: './window-pane.component.html',
  styleUrls: ['./window-pane.component.sass']
})
export abstract class WindowPaneComponent implements AfterViewInit {
  static readonly ANTI_ALIASING = 2;

  private frameStart = 0;
  private static nextID: number = 1;

  @Input('viewShader')
  viewShaderName: string = '';

  @Input('pickShader')
  pickShaderName: string = '';

  @ViewChild('canvas', {static: true})
  canvasRef!: ElementRef<HTMLCanvasElement>;

  canvas!: HTMLCanvasElement;
  gl!: WebGL2RenderingContext;
  scene = new Scene();
  camera: Camera = new PerspectiveCamera();

  protected selectables = new Map<number, Selectable>();
  protected selectableLabels = new Map<string, number>();
  protected selectedID = 0;

  protected viewShader!: Shader;
  protected pickShader!: Shader;
  private pickFB!: Framebuffer;

  constructor() {
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    if (canvas === null) throw Error('Null canvas');
    this.canvas = (canvas as HTMLCanvasElement);

    const gl = this.canvas.getContext('webgl2');
    if (gl === null) throw Error('Null WebGL2 context');
    this.gl = gl;

    this.fixCanvasDimensions();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.frameStart = performance.now();

    this.pickFB = new Framebuffer(this.gl,
        this.canvas.width, this.canvas.height,
        this.gl.UNSIGNED_BYTE, this.gl.RGBA);

    const viewShaderPromise = Shader.fromPaths(this.gl,
        `assets/shaders/${this.viewShaderName}.vert`,
        `assets/shaders/${this.viewShaderName}.frag`);
    const pickShaderPromise = Shader.fromPaths(this.gl,
        `assets/shaders/${this.pickShaderName}.vert`,
        `assets/shaders/${this.pickShaderName}.frag`);

    Promise.all([viewShaderPromise, pickShaderPromise]).then(([view, pick]) => {
      this.viewShader = view;
      this.pickShader = pick;

      this.init();
      this.loop(this.frameStart);
    });
  }

  init(): void {

  }

  loop(now: number): void {
    const dt = now - this.frameStart;
    this.frame(dt);

    this.pick();
    this.draw();

    this.frameStart = now;
    window.requestAnimationFrame(this.loop.bind(this));
  }

  frame(dt: number): void {

  }

  protected pick(): void {
    this.gl.enable(this.gl.CULL_FACE);

    this.pickFB.bind();
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.disable(this.gl.BLEND);
    this.pickShader.bind();
    this.pickShader.setUniform('uCamera', this.camera.matrix);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    for (let s of this.selectables.values()) this.drawSelectable(s);
    this.pickFB.unbind();
  }

  draw(): void {

  }

  protected fixCanvasDimensions() {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth  = WindowPaneComponent.ANTI_ALIASING * this.canvas.clientWidth;
    const displayHeight = WindowPaneComponent.ANTI_ALIASING * this.canvas.clientHeight;

    // Check if the canvas is not the same size.
    const needResize = (this.canvas.width !== displayWidth) || (this.canvas.height !== displayHeight);

    if (needResize) {
      // Make the canvas the same size
      this.canvas.width  = displayWidth;
      this.canvas.height = displayHeight;
    }

    return needResize;
  }

  mouseDown(x: number, y: number): void {
    const pixelX = x * this.gl.canvas.width / this.gl.canvas.clientWidth;
    const pixelY = this.gl.canvas.height - y * this.gl.canvas.height / this.gl.canvas.clientHeight - 1;
    this.selectedID = this.pickFB.readPixel(pixelX, pixelY);
    if (this.selectedID > 0) {
      const s = this.selectables.get(this.selectedID);
      s?.mouseDown(x, y);
    }
  }

  mouseMove(x: number, y: number): void {
    if (this.selectedID <= 0) return;
    const s = this.selectables.get(this.selectedID);
    s?.mouseMove(x, y);
  }

  mouseUp(x: number, y: number): void {
    if (this.selectedID <= 0) return;
    const s = this.selectables.get(this.selectedID);
    s?.mouseUp(x, y);
    this.selectedID = 0;
  }

  onMouseDown(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - Math.trunc(r.x);
    const y = e.clientY - Math.trunc(r.y);
    this.mouseDown(x, y);
  }

  onMouseMove(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - Math.trunc(r.x);
    const y = e.clientY - Math.trunc(r.y);
    this.mouseMove(x, y);
  }

  onMouseUp(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - Math.trunc(r.x);
    const y = e.clientY - Math.trunc(r.y);
    this.mouseUp(x, y);
  }

  protected addSelectable(label: string, selectable: Selectable) {
    this.selectableLabels.set(label, selectable.id);
    this.selectables.set(selectable.id, selectable);
  }

  protected viewportToWorld(x: number, y: number): Vector4 {
    const xScreen = x * WindowPaneComponent.ANTI_ALIASING / this.canvas.width * 2 - 1;
    const yScreen = 1 - y * WindowPaneComponent.ANTI_ALIASING  / this.canvas.height * 2;
    const v = new Vector4(xScreen, yScreen, 0, 1);
    const w = v.applyMatrix4(this.camera.matrix.invert());
    return w.multiplyScalar(1 / w.w);
  }

  static getSelectable(i?: number): Selectable {
    const id = i || WindowPaneComponent.nextID;
    if (!i) {
      WindowPaneComponent.nextID ++;
    }
    const uId = new Vector4(
        ((id >>  0) & 0xFF) / 0xFF,
        ((id >>  8) & 0xFF) / 0xFF,
        ((id >> 16) & 0xFF) / 0xFF,
        ((id >> 24) & 0xFF) / 0xFF);
    return {
      id, uId,

      mouseDown: () => {},
      mouseMove: () => {},
      mouseUp: () => {},
    };
  }

  drawSelectable(s: Selectable) {
    this.pickShader.setUniform('uId', s.uId);
    s.drawable?.draw(this.pickShader);
  }
}

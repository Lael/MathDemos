import { Component, AfterViewInit } from '@angular/core';
import { Shader } from '../../../graphics/gl/shader';
import {MathDemo} from "../math-demo";
import { Scene } from "../../../graphics/scene";
import {HyperbolicOuterBilliards, VertexHandle} from '../../../math/hyperbolic/hyperbolic-outer-billiards';
import {Camera2D} from "../../../graphics/camera/camera2D";

@Component({
  selector: 'app-billiards-demo',
  templateUrl: './billiards-demo.component.html',
  styleUrls: ['./billiards-demo.component.sass']
})
export class BilliardsDemoComponent extends MathDemo implements AfterViewInit {
  private hob!: HyperbolicOuterBilliards;

  constructor() {
    super();
  }

  ngAfterViewInit(): void {
    const canvas = document.getElementById('billiards-canvas');
    if (canvas === null) throw Error('Null canvas');
    this.canvas = (canvas as HTMLCanvasElement);

    const gl = this.canvas.getContext('webgl2');
    if (gl === null) throw Error('Null WebGL2 context');

    this.fixCanvasDimensions(canvas as HTMLCanvasElement);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const scene = new Scene();
    const camera = new Camera2D();
    camera.setZoom(Math.sqrt(2) / 0.9);
    this.hob = new HyperbolicOuterBilliards(gl);

    this.gl = gl;
    this.scene = scene;
    this.camera = camera;

    Shader.fromPaths(gl, 'assets/shaders/demo2d.vert', 'assets/shaders/demo2d.frag').then(shader => {
      this.viewShader = shader;
      this.run();
    });
  }

  protected override init(): void {
    this.hob.populateScene(this.scene!);

    for (let i = 0; i < this.hob.vertices.length; i++) {
      this.addSelectable(`vertex_handle_${i + 1}`, new VertexHandle(this.gl, i, this.hob, this.scene, this.viewportToWorld.bind(this)));
    }
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

  protected override frame(dt: number): void {
    this.hob.populateScene(this.scene!);
  }
}

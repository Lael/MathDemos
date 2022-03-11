import { Component, AfterViewInit } from '@angular/core';
import { Shader } from '../../../graphics/gl/shader';
import { MathDemo } from "../math-demo";
import { Scene } from "../../../graphics/scene";
import { HyperbolicOuterBilliards } from '../../../math/hyperbolic/hyperbolic-outer-billiards';
import {Camera2D} from "../../../graphics/camera/camera2D";
import {Complex} from "../../../math/complex";
import {Color} from "../../../graphics/shapes/color";
import {Disk, DiskSpec} from "../../../graphics/shapes/disk";

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
    if (canvas === null) {
      console.error('Null canvas');
      return;
    }

    const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
    if (gl === null) {
      console.error('Null WebGL2 context');
      return;
    }

    MathDemo.fixCanvasDimensions(canvas as HTMLCanvasElement);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const scene = new Scene();
    const camera = new Camera2D();
    camera.setZoom(Math.sqrt(2) / 0.9);
    this.hob = new HyperbolicOuterBilliards(gl);

    Shader.fromPaths(gl, 'assets/shaders/demo2d.vert', 'assets/shaders/demo2d.frag').then(shader => {
      this.run(gl, scene, shader, camera);
    });
  }

  protected override init(): void {
    const color = Color.ONYX;
    this.gl!.clearColor(color.r, color.g, color.b, 1);

    // Poincaré disk model
    this.scene!.set('disk', new Disk(this.gl!, new DiskSpec(new Complex(), 1, Color.BLUSH, Color.BLACK)))

    this.hob.populateScene(this.scene!);
  }

  protected override frame(dt: number): void {

  }
}

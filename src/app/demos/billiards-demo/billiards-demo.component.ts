import { Component, AfterViewInit } from '@angular/core';
import { Shader } from '../../../graphics/gl/shader';
import { MathDemo } from "../math_demo";
import { Scene } from "../../../graphics/scene";
import { Camera } from "../../../graphics/camera/camera";
import { HyperbolicOuterBilliards } from './hyperbolic-outer-billiards';

@Component({
  selector: 'app-billiards-demo',
  templateUrl: './billiards-demo.component.html',
  styleUrls: ['./billiards-demo.component.sass']
})
export class BilliardsDemoComponent extends MathDemo implements AfterViewInit {

  private readonly hob = new HyperbolicOuterBilliards();

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

    console.log('GL context loaded');

    const scene = new Scene();
    const camera = new Camera();

    Shader.fromPaths(gl, 'assets/shaders/demo2d.vert', 'assets/shaders/demo2d.frag').then(shader => {
      this.run(gl, scene, shader, camera);
    });
  }

  protected override init(): void {
    this.gl!.clearColor(0.2, 0, 0, 1);
  }

  protected override frame(dt: number): void {

  }
}

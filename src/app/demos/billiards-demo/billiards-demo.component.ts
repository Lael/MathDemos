import { Component, AfterViewInit } from '@angular/core';
import { Shader } from '../../../graphics/gl/shader';
import {MathDemo} from "../math_demo";
import {Scene} from "../../../graphics/scene";
import {Camera} from "../../../graphics/camera/camera";

@Component({
  selector: 'app-billiards-demo',
  templateUrl: './billiards-demo.component.html',
  styleUrls: ['./billiards-demo.component.sass']
})
export class BilliardsDemoComponent extends MathDemo implements AfterViewInit {

  private gl: WebGL2RenderingContext|undefined = undefined;

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

    this.gl = gl;
    console.log('GL context loaded');

    const scene = new Scene();
    const shader = Shader.fromPaths(gl, '/resources/shaders/demo2d.frag', '/resources/shaders/demo2d.vert');
    const camera = new Camera();
    this.run(scene, shader, camera);
  }

}

import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-billiards-demo',
  templateUrl: './billiards-demo.component.html',
  styleUrls: ['./billiards-demo.component.sass']
})
export class BilliardsDemoComponent implements AfterViewInit {

  private gl: WebGL2RenderingContext|undefined = undefined;

  constructor() { }

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
  }

}

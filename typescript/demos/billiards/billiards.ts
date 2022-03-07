import {MathDemo} from '../math_demo';

export class Billiards extends MathDemo {
    constructor(canvas: HTMLCanvasElement) {
        const gl = canvas.getContext("webgl2");
        if (gl === null) {
            throw new Error('Null WebGL context!');
        }

        const scene = new Scene();
        const shader = Shader.fromPaths(gl, '/resources/shaders/demo2d.frag', '/resources/shaders/demo2d.vert');
        const camera = new Camera();

        super(scene, shader, camera);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('billiards-canvas');
    if (canvas === null) {
        throw new Error('Null canvas!');
    } else {
        new Billiards(canvas as HTMLCanvasElement).run();
    }
});
import {Shader} from "../../graphics/gl/shader";
import {Camera} from "../../graphics/camera/camera";
import {Scene} from "../../graphics/scene";

export class MathDemo {
    protected gl?: WebGL2RenderingContext;
    protected scene?: Scene;
    protected shader?: Shader;
    protected camera?: Camera;

    private frameStart: number = Date.now();

    constructor() {
    }

    run(gl: WebGL2RenderingContext, scene: Scene, shader: Shader, camera: Camera) {
        this.gl = gl;
        this.scene = scene;
        this.shader = shader;
        this.camera = camera;

        this.init();
        this.loop(Date.now());
    }

    protected init() {

    }

    protected frame(dt: number): void {

    }

    protected loop(now: number): void {
        if (!this.gl || !this.scene || !this.shader || !this.camera) throw Error('Uninitialized!');

        // Update state
        const dt = now - this.frameStart;
        this.frame(dt);

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.scene!.draw(this.shader, this.camera);
        window.requestAnimationFrame(this.loop.bind(this));
    }
}
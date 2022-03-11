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

    protected static fixCanvasDimensions(canvas: HTMLCanvasElement) {
        const aa = 2;
        // Lookup the size the browser is displaying the canvas in CSS pixels.
        const displayWidth  = aa * canvas.clientWidth;
        const displayHeight = aa * canvas.clientHeight;

        // Check if the canvas is not the same size.
        const needResize = canvas.width  !== displayWidth ||
            canvas.height !== displayHeight;

        if (needResize) {
            // Make the canvas the same size
            canvas.width  = displayWidth;
            canvas.height = displayHeight;
        }

        return needResize;
    }
}
import {Shader} from "../../graphics/gl/shader";
import {Camera} from "../../graphics/camera/camera";
import {Scene} from "../../graphics/scene";
import {Framebuffer} from "../../graphics/gl/framebuffer";
import {Vector4} from "three";
import {Drawable2D} from "../../graphics/shapes/drawable2D";
import {Complex} from "../../math/complex";
import {Color} from "../../graphics/shapes/color";

export class MathDemo {
    protected canvas!: HTMLCanvasElement;
    protected gl!: WebGL2RenderingContext;
    protected scene!: Scene;
    protected viewShader!: Shader;
    protected camera!: Camera;

    private pickShader!: Shader;
    private pickFB!: Framebuffer;
    protected selectableLabels: Map<string, number> = new Map<string, number>();
    protected selectables: Map<number, Selectable> = new Map<number, Selectable>();
    protected selectedID: number = 0;

    private frameStart: number = 0;
    private static readonly ANTI_ALIASING = 2;

    constructor() {}

    run() {
        this.pickFB = new Framebuffer(this.gl,
            this.canvas.width, this.canvas.height,
            this.gl.UNSIGNED_BYTE, this.gl.RGBA);

        Shader.fromPaths(this.gl, 'assets/shaders/pick.vert', 'assets/shaders/pick.frag').then(
            shader => {
                this.pickShader = shader;
                this.init();
                this.frameStart = Date.now();
                this.loop(Date.now());
            });
    }

    protected init() {

    }

    protected frame(dt: number): void {

    }

    protected loop(now: number): void {
        if (!this.gl || !this.scene || !this.viewShader || !this.camera) throw Error('Uninitialized!');

        // Update state
        const dt = now - this.frameStart;
        this.frame(dt);
        this.gl.enable(this.gl.CULL_FACE);

        this.pickFB.bind();
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.disable(this.gl.BLEND);
        this.pickShader.bind();
        this.pickShader.setUniform('uCamera', this.camera.matrix);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        for (let s of this.selectables.values()) {
            s.draw(this.pickShader);
        }
        this.pickFB.unbind();

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.viewShader.bind();
        const color = Color.ONYX;
        this.gl.clearColor(color.r, color.g, color.b, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        // for (let s of this.selectables.values()) {
        //     s.draw(this.pickShader);
        // }
        this.scene.draw(this.viewShader, this.camera);
        window.requestAnimationFrame(this.loop.bind(this));
    }

    protected mouseDown(x: number, y: number): void {
        const pixelX = x * this.gl.canvas.width / this.gl.canvas.clientWidth;
        const pixelY = this.gl.canvas.height - y * this.gl.canvas.height / this.gl.canvas.clientHeight - 1;
        this.selectedID = this.pickFB.readPixel(pixelX, pixelY);
        if (this.selectedID > 0) {
            const s = this.selectables.get(this.selectedID);
            s?.mouseDown(x, y, s);
        }
    }

    protected mouseMove(x: number, y: number): void {
        if (this.selectedID <= 0) return;
        const s = this.selectables.get(this.selectedID);
        s?.mouseMove(x, y, s);
    }

    protected mouseUp(x: number, y: number): void {
        if (this.selectedID <= 0) return;
        const s = this.selectables.get(this.selectedID);
        s?.mouseUp(x, y, s);
        this.selectedID = 0;
    }

    protected viewportToWorld(x: number, y: number): Complex {
        const xScreen = x * MathDemo.ANTI_ALIASING / this.canvas.width * 2 - 1;
        const yScreen = 1 - y * MathDemo.ANTI_ALIASING  / this.canvas.height * 2;
        const v = new Vector4(xScreen, yScreen, 0, 1);
        const world = v.applyMatrix4(this.camera.matrix.invert());
        return new Complex(world.x, world.y);
    }

    protected addSelectable(label: string, selectable: Selectable) {
        this.selectableLabels.set(label, selectable.id);
        this.selectables.set(selectable.id, selectable);
    }

    protected fixCanvasDimensions(canvas: HTMLCanvasElement) {
        // Lookup the size the browser is displaying the canvas in CSS pixels.
        const displayWidth  = MathDemo.ANTI_ALIASING * canvas.clientWidth;
        const displayHeight = MathDemo.ANTI_ALIASING * canvas.clientHeight;

        // Check if the canvas is not the same size.
        const needResize = (canvas.width !== displayWidth) || (canvas.height !== displayHeight);

        if (needResize) {
            // Make the canvas the same size
            canvas.width  = displayWidth;
            canvas.height = displayHeight;
        }

        return needResize;
    }
}

export class Selectable {
    private static nextID: number = 1;
    readonly id: number;
    private readonly uId: Vector4;
    constructor(protected readonly drawable: Drawable2D,
                readonly mouseDown: Function,
                readonly mouseMove: Function,
                readonly mouseUp: Function, ) {
        this.id = Selectable.nextID;
        Selectable.nextID ++;
        this.uId = new Vector4(
            ((this.id >>  0) & 0xFF) / 0xFF,
            ((this.id >>  8) & 0xFF) / 0xFF,
            ((this.id >> 16) & 0xFF) / 0xFF,
            ((this.id >> 24) & 0xFF) / 0xFF);
    }

    draw(shader: Shader) {
        shader.setUniform('uId', this.uId);
        this.drawable.draw(shader);
    }
}
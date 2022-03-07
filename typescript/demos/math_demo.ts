export class MathDemo {
    protected scene: Scene;
    protected shader: Shader;
    protected camera: Camera;

    constructor(scene: Scene, shader: Shader, camera: Camera) {
        this.scene = scene;
        this.shader = shader;
        this.camera = camera;
    }

    run() {
        this.init();
        this.loop();
    }

    protected init() {

    }

    protected loop() {
        requestAnimationFrame(this.frame);
    }

    protected frame(now: number) {
        // Update FPS

        this.scene.draw(this.shader, this.camera);
        requestAnimationFrame(this.frame);
    }
}
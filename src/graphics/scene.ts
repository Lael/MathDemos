import { Camera } from "./camera/camera";
import { Shader } from "./gl/shader";
import {Drawable2D} from "./shapes/drawable2D";

export class Scene {
    private readonly drawables: Map<string, Drawable2D>;

    constructor() {
        this.drawables = new Map<string, Drawable2D>();
    }

    set(name: string, drawable: Drawable2D): void {
        this.drawables.set(name, drawable);
    }

    get(name: string): Drawable2D|undefined {
        return this.drawables.get(name);
    }

    remove(name: string): boolean {
        return this.drawables.delete(name);
    }

    draw(shader: Shader, camera: Camera) {
        shader.bind();
        shader.setUniform('uCamera', camera.matrix);

        for (let drawable of this.drawables.values()) {
            drawable.draw();
        }

        shader.unbind();
    }

    clear() {
        this.drawables.clear();
    }
}
import { Camera } from "./camera/camera";
import { Shader } from "./gl/shader";
import {Drawable} from "./shapes/drawable";

export class Scene {
    private readonly drawables: Map<string, Drawable>;

    constructor() {
        this.drawables = new Map<string, Drawable>();
    }

    set(name: string, drawable: Drawable): void {
        this.drawables.set(name, drawable);
    }

    get(name: string): Drawable|undefined {
        return this.drawables.get(name);
    }

    remove(name: string): boolean {
        return this.drawables.delete(name);
    }

    draw(shader: Shader, camera: Camera) {
        shader.bind();
        shader.setUniform('uCamera', camera.matrix);

        for (let drawable of this.drawables.values()) {
            drawable.draw(shader);
        }

        shader.unbind();
    }

    clear() {
        this.drawables.clear();
    }
}
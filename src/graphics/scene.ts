import { Camera } from "./camera/camera";
import { Shader } from "./gl/shader";
import { Shape } from "./shapes/shape";

export class Scene {
    private readonly shapes: Map<string, Shape>;

    constructor() {
        this.shapes = new Map<string, Shape>();
    }

    set(name: string, shape: Shape): void {
        this.shapes.set(name, shape);
    }

    get(name: string): Shape|undefined {
        return this.shapes.get(name);
    }

    remove(name: string): boolean {
        return this.shapes.delete(name);
    }

    draw(shader: Shader, camera: Camera) {
        for (let shape of this.shapes.values()) {
            shape.draw(shader, camera);
        }
    }
}
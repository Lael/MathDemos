import {Shape} from "./shape";
import {Matrix4, Vector3} from "three";
import {Shader} from "../gl/shader";

export class Drawable {
    protected model: Matrix4 = new Matrix4();
    constructor(readonly shapes: Shape[]) {}

    draw(shader: Shader) {
        for (let shape of this.shapes) {
            shader.setUniform('uModel', this.model);
            shape.draw();
        }
    }

    recenter(x: number, y: number, z: number) {
        this.model.setPosition(x, y, z);
    }

    scale(r: number) {
        this.model.scale(new Vector3(r, r, r));
    }
}
import {Shape2D} from "./shape2D";
import {Matrix4} from "three";
import {Shader} from "../gl/shader";

export class Drawable2D {
    protected model: Matrix4 = new Matrix4();
    constructor(readonly shapes: Shape2D[]) {}

    draw(shader: Shader) {
        for (let shape of this.shapes) {
            shader.setUniform('uModel', this.model);
            shape.draw();
        }
    }

    recenter(x: number, y: number, z: number) {
        this.model.setPosition(x, y, z);
    }
}
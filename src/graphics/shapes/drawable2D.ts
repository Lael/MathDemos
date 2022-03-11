import {Shape2D} from "./shape2D";

export class Drawable2D {
    constructor(readonly shapes: Shape2D[]) {
    }

    draw() {
        for (let shape of this.shapes) {
            shape.draw();
        }
    }
}
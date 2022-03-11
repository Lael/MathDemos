import {Camera} from "./camera";
import {Matrix4} from "three";

export class Camera2D extends Camera {
    protected override computeCameraMatrix(): Matrix4 {
        const rx = this.right.x;
        const ry = this.right.y;
        const ux = this.up.x;
        const uy = this.up.y;
        const rotate = new Matrix4().set(
            uy, -ry, 0, 0,
            -ux, rx, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );

        const angle = (Math.PI / 2 - Math.atan(this.aspectRatio));
        const w = Math.cos(angle) * this.zoom;
        const h = Math.sin(angle) * this.zoom;
        const scale = new Matrix4().set(
            1.0 / w, 0, 0, 0,
            0, -1.0 / h, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );

        const px = this.position.x;
        const py = this.position.y;
        const translate = new Matrix4().set(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            -px, -py, 0, 1
        );
        return scale.multiply(translate).multiply(rotate);
    }
}
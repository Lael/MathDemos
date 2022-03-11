import {Matrix4, Vector3} from "three";

export abstract class Camera {
    // The camera's position in world-space.
    protected position = new Vector3(0, 0, 1);

    // Forward, up, & right form should be kept orthonormal.
    protected right = new Vector3(-1, 0, 0);
    protected up = new Vector3(0, 1, 0);
    protected forward = new Vector3(0, 0, -1);

    // Viewport width / height
    protected aspectRatio = 1.0;

    // distance to corner of view from point 1 unit along forward vector.
    protected zoom = 1.0;

    // Clip planes (orthogonal to the forward direction)
    protected near = 0.1;
    protected far = 1.0;

    // A small optimization: cache the camera matrix
    private dirty = true;
    private cameraMatrix: Matrix4 = new Matrix4();

    private updateBasis(): void {
        this.right.crossVectors(this.forward, this.up);
        this.forward.crossVectors(this.up, this.right);
        this.right.normalize();
        this.forward.normalize();
        this.up.normalize();
    }

    protected markDirty(): void {
        this.dirty = true;
    }

    setPosition(position: Vector3): void {
        this.position = position;
        this.markDirty();
    }

    setForward(forward: Vector3): void {
        this.forward = forward.normalize();
        this.updateBasis();
        this.markDirty();
    }

    setUp(up: Vector3): void {
        this.up = up.normalize();
        this.updateBasis();
        this.markDirty();
    }

    setAspectRation(aspectRatio: number): void {
        this.aspectRatio = aspectRatio;
        this.markDirty();
    }

    setZoom(zoom: number): void {
        this.zoom = zoom;
        this.markDirty();
    }

    moveWorld(t: Vector3): void {
        this.position.add(t);
        this.markDirty();
    }

    moveCamera(t: Vector3): void {
        this.position.add(this.right.clone().setLength(t.x));
        this.position.add(this.up.clone().setLength(t.y));
        this.position.add(this.forward.clone().setLength(t.z));
        this.markDirty();
    }

    get matrix() {
        if (this.dirty) {
            this.dirty = false;
            this.cameraMatrix = this.computeCameraMatrix();
        }
        return this.cameraMatrix.clone();
    }

    protected abstract computeCameraMatrix(): Matrix4;
}

import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    AxesHelper,
    BufferGeometry,
    Color,
    InstancedMesh,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Points,
    PointsMaterial,
    SphereGeometry,
    Vector2,
    Vector3,
    Vector4
} from 'three';
import * as dat from 'dat.gui';
import {closeEnough} from "../../../math/math-helpers";
import {clamp} from "three/src/math/MathUtils";
import {ParametricGeometry} from "three/examples/jsm/geometries/ParametricGeometry";

// Colors
const CLEAR_COLOR = new Color(0x000000);
const DOT_COLOR = new Color(0xFFFFFF);
const MANIFOLD_COLOR = new Color(0xFF0000);


// Other constants
const CAMERA_SPEED_XY = 1; // world-space units/second at z=1
const CAMERA_SPEED_Z = 0.5; // world-space units/second at z=1

enum Projection3D {
    X1 = 'x_1',
    X2 = 'x_2',
    Y1 = 'y_1',
    Y2 = 'y_2',
}

enum Projection2D {
    X1X2 = 'x_1, x_2',
    X1Y1 = 'x_1, y_1',
    X1Y2 = 'x_1, y_2',
    X2Y1 = 'x_2, y_1',
    X2Y2 = 'x_2, y_2',
    Y1Y2 = 'y_1, y_2',
}

type SymplecticParams = {
    use3D: boolean;
    projection2D: Projection2D;
    projection3D: Projection3D;
    iterations: number;
    forward: boolean;
    backward: boolean;
    drawManifold: boolean;
    rescaleY: number;
};


@Component({
    selector: 'symplectic',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class SymplecticComponent extends ThreeDemoComponent {
    gui: dat.GUI = new dat.GUI();

    cameraDist = 5;
    cameraTheta = Math.PI / 4;
    cameraPhi = Math.PI / 4;

    params: SymplecticParams = {
        use3D: false,
        projection2D: Projection2D.X1X2,
        projection3D: Projection3D.Y2,
        iterations: 1000,
        forward: true,
        backward: true,
        drawManifold: true,
        rescaleY: 1,
    };

    start = new Vector4(0.01, 0.02, 0.03, 0.04);
    orbit: Vector4[] = [];

    drawDirty = true;

    constructor() {
        super();
        this.updateCamera();
        this.perspectiveCamera.fov = 60;
        this.perspectiveCamera.updateProjectionMatrix();

        this.renderer.setClearColor(CLEAR_COLOR);

        this.updateGUI();
        this.computeOrbit();
    }

    private updateCamera() {
        if (this.params.use3D) {
            this.useOrthographic = false;
            this.perspectiveCamera.position.set(
                this.cameraDist * Math.cos(this.cameraPhi) * Math.cos(this.cameraTheta),
                this.cameraDist * Math.cos(this.cameraPhi) * Math.sin(this.cameraTheta),
                this.cameraDist * Math.sin(this.cameraPhi),
            );
            this.perspectiveCamera.lookAt(0, 0, 0);
            this.perspectiveCamera.up.set(0, 0, 1);
        } else {
            this.useOrthographic = true;
            this.updateOrthographicCamera();
        }
    }

    private processKeyboardInput(dt: number): void {
        // Camera
        const cameraDiff = new Vector3();
        if (this.keysPressed.get('KeyW')) cameraDiff.y += 1;
        if (this.keysPressed.get('KeyA')) cameraDiff.x -= 1;
        if (this.keysPressed.get('KeyS')) cameraDiff.y -= 1;
        if (this.keysPressed.get('KeyD')) cameraDiff.x += 1;
        if (cameraDiff.length() !== 0) cameraDiff.normalize();
        if (this.params.use3D) {
            this.cameraTheta += CAMERA_SPEED_XY * dt * cameraDiff.x;
            this.cameraPhi += CAMERA_SPEED_XY * dt * cameraDiff.y;
            this.cameraPhi = clamp(this.cameraPhi, -Math.PI * 0.49, Math.PI * 0.49);
        } else {
            this.orthographicCamera.position.x += CAMERA_SPEED_XY * dt * cameraDiff.x * this.orthographicDiagonal;
            this.orthographicCamera.position.y += CAMERA_SPEED_XY * dt * cameraDiff.y * this.orthographicDiagonal;
        }

        let zoomDiff = 1;
        if (this.keysPressed.get('Space')) zoomDiff += CAMERA_SPEED_Z * dt;
        if (this.keysPressed.get('ShiftLeft')) zoomDiff -= CAMERA_SPEED_Z * dt;
        if (this.params.use3D) {
            this.cameraDist *= zoomDiff;
        } else {
            this.orthographicDiagonal *= zoomDiff;
        }
        this.updateCamera();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);
        if (this.drawDirty) {
            this.drawOrbit();
            this.updateCamera();
            this.drawDirty = false;
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    markDrawDirty(): void {
        this.drawDirty = true;
        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const viewFolder = this.gui.addFolder('View');
        viewFolder.add(this.params, 'use3D')
            .name('3D').onFinishChange(this.markDrawDirty.bind(this));
        if (this.params.use3D) {
            viewFolder.add(this.params, 'projection3D', Object.values(Projection3D))
                .name('Project along').onFinishChange(this.markDrawDirty.bind(this));
            viewFolder.add(this.params, 'drawManifold')
                .name('Draw Manifold').onFinishChange(this.markDrawDirty.bind(this));
        } else {
            viewFolder.add(this.params, 'projection2D', Object.values(Projection2D))
                .name('Project onto').onFinishChange(this.markDrawDirty.bind(this));
        }
        viewFolder.add(this.params, 'rescaleY')
            .name('Rescale Y').min(1).max(100).step(1)
            .onFinishChange(this.markDrawDirty.bind(this));
        viewFolder.open();

        const MIN = -10;
        const MAX = 10;

        const gameFolder = this.gui.addFolder('Game');
        gameFolder.add(this.params, 'forward')
            .name('Forward').onFinishChange(this.computeOrbit.bind(this));
        gameFolder.add(this.params, 'backward')
            .name('Reverse').onFinishChange(this.computeOrbit.bind(this));
        gameFolder.add(this.params, 'iterations')
            .name('Iterations').min(10).max(1000).step(10).onFinishChange(this.computeOrbit.bind(this));
        gameFolder.add(this.start, 'x')
            .name('x_1').min(MIN).max(MAX)
            .onChange(this.computeOrbit.bind(this));
        gameFolder.add(this.start, 'y')
            .name('x_2').min(MIN).max(MAX)
            .onChange(this.computeOrbit.bind(this));
        gameFolder.add(this.start, 'z')
            .name('y_1').min(MIN).max(MAX)
            .onChange(this.computeOrbit.bind(this));
        gameFolder.add(this.start, 'w')
            .name('y_2').min(MIN).max(MAX)
            .onChange(this.computeOrbit.bind(this));
        gameFolder.open();

        this.gui.open();
    }

    computeOrbit() {
        // this.updateGUI();
        this.orbit = [this.start];
        this.drawDirty = true;
        let sp: Vector4;
        let sm: Vector4;
        try {
            [sp, sm] = [...this.nextPoint(this.start)];
        } catch (e) {
            console.error(e);
            return;
        }
        // arbitrarily designate sp as the ''forward'' direction
        let prev = this.start.clone();
        let current = sp;

        for (let i = 0; i < this.params.iterations; i++) {
            this.orbit.push(current);
            try {
                [sp, sm] = [...this.nextPoint(current)];
            } catch (e) {
                console.error(e);
                return;
            }
            const dp = sp.clone().sub(current).lengthSq();
            const dm = sm.clone().sub(current).lengthSq();
            let next;
            if (dm < dp) {
                next = sp;
            } else {
                next = sm;
            }
            prev = current;
            current = next;
        }

        if (!this.params.forward) return;

        [sp, sm] = [...this.nextPoint(this.start)];

        prev = this.start.clone();
        current = sm;

        for (let i = 0; i < this.params.iterations; i++) {
            this.orbit.push(current);
            try {
                [sp, sm] = [...this.nextPoint(current)];
            } catch (e) {
                console.error(e);
                return;
            }
            const dp = sp.clone().sub(current).lengthSq();
            const dm = sm.clone().sub(current).lengthSq();
            let next;
            if (dm < dp) {
                next = sp;
            } else {
                next = sm;
            }
            prev = current;
            current = next;
        }
    }


    nextPoint(vec: Vector4): Vector4[] {
        const x1 = vec.x;
        const x2 = vec.y;
        const y1 = vec.z;
        const y2 = vec.w;

        if (closeEnough(y1, x2 * x2 + 2 * x1 * x2) &&
            closeEnough(y2, x1 * x1 + 2 * x1 * x2)) {
            throw Error(`Point on singular manifold: (${x1}, ${x2}, ${y1}, ${y2})`);
        }

        const k1 = (x1 + x2) * (x1 + x2) - x1 * x1 - y1;
        const k2 = (x1 + x2) * (x1 + x2) - x2 * x2 - y2;

        const aSquared = ((2 * k2 - 4 * k1) + Math.sqrt((4 * k1 - 2 * k2) * (4 * k1 - 2 * k2) + 12 * k2 * k2)) / 6;

        const ap = Math.sqrt(aSquared);
        const am = -ap;
        let bp: number;
        if (am === 0) {
            bp = Math.sqrt(k1);
        } else {
            bp = 2 * k1 * ap / (3 * aSquared + k2);
        }
        const bm = -bp;

        // a = q1 - x1 => q1 = a + x1
        // b = q2 - x2 => q2 = b + x2
        const q1p = ap + x1;
        const q2p = bp + x2;
        const q1m = am + x1;
        const q2m = bm + x2;

        // X_1 = 2q_1 - x_1
        // X_2 = 2q_2 - x_2
        // Y_1 = 4 q_1 q_2 + 2 (q_2)^2 - y_1
        // Y_2 = 2 (q_1)^2 + 4 q_1 q_2 - y_2
        const sp = new Vector4(
            2 * q1p - x1,
            2 * q2p - x2,
            4 * q1p * q2p + 2 * q2p * q2p - y1,
            2 * q1p * q1p + 4 * q1p * q2p - y2,
        );

        const sm = new Vector4(
            2 * q1m - x1,
            2 * q2m - x2,
            4 * q1m * q2m + 2 * q2m * q2m - y1,
            2 * q1m * q1m + 4 * q1m * q2m - y2,
        );

        this.confirmSolution(vec, q1p, q2p);
        this.confirmSolution(vec, q1m, q2m);

        return [sp, sm];
    }

    private confirmSolution(vec: Vector4, q1: number, q2: number) {
        const x1 = vec.x;
        const x2 = vec.y;
        const y1 = vec.z;
        const y2 = vec.w;

        const a = q1 - x1;
        const b = q2 - x2;

        const eq1 = closeEnough((a + b) * (a + b) - a * a, (x1 + x2) * (x1 + x2) - x1 * x1 - y1);
        const eq2 = closeEnough((a + b) * (a + b) - b * b, (x1 + x2) * (x1 + x2) - x2 * x2 - y2);
        if (!eq1 || !eq2) throw Error(`Bad solution: (${x1}, ${x2}, ${y1}, ${y2}), (${q1}, ${q2})`);
    }

    drawOrbit() {
        const xColor = new Color(0xff0000);
        const yColor = new Color(0x00ff00);
        const zColor = new Color(0x0000ff);
        const wColor = new Color(0xff00ff);
        const white = new Color(0xffffff);
        this.scene.clear();

        const axesHelper = new AxesHelper(1);
        const ballGeometry = new SphereGeometry(0.04);
        let lGeometry;
        const lMaterial = new MeshBasicMaterial({color: 0x00ff00, wireframe: true});
        let lMesh;
        if (this.params.use3D) {
            const points: Vector3[] = [];
            switch (this.params.projection3D) {
            case Projection3D.X1:
                for (let point of this.orbit) points.push(new Vector3(point.y, point.z / this.params.rescaleY, point.w / this.params.rescaleY));
                axesHelper.setColors(yColor, zColor, wColor);
                break;
            case Projection3D.X2:
                for (let point of this.orbit) points.push(new Vector3(point.x, point.z / this.params.rescaleY, point.w / this.params.rescaleY));
                axesHelper.setColors(xColor, zColor, wColor);
                break;
            case Projection3D.Y1:
                for (let point of this.orbit) points.push(new Vector3(point.x, point.y, point.w / this.params.rescaleY));
                axesHelper.setColors(xColor, yColor, wColor);
                if (!this.params.drawManifold) break;
                lGeometry = new ParametricGeometry((u, v, target) => {
                    const x1 = (u - 0.5) * 100;
                    const x2 = (v - 0.5) * 100;
                    const y2 = x1 * x1 + 2 * x1 * x2;
                    target.set(x1, x2, y2 / this.params.rescaleY);
                }, 100, 100);
                lMesh = new Mesh(lGeometry, lMaterial);
                this.scene.add(lMesh);
                break;
            case Projection3D.Y2:
                for (let point of this.orbit) points.push(new Vector3(point.x, point.y, point.z / this.params.rescaleY));
                axesHelper.setColors(xColor, yColor, zColor);

                const pointGeo = new SphereGeometry(0.03);
                const instancedMesh = new InstancedMesh(pointGeo, new MeshBasicMaterial({color: new Color(0xffffff)}), points.length);
                for (let i = 0; i < points.length; i++) {
                    instancedMesh.setMatrixAt(i, new Matrix4().makeTranslation(points[i].x, points[i].y, points[i].z));
                }
                instancedMesh.instanceMatrix.needsUpdate = true;
                this.scene.add(instancedMesh);

                if (!this.params.drawManifold) break;
                lGeometry = new ParametricGeometry((u, v, target) => {
                    const x1 = (u - 0.5) * 100;
                    const x2 = (v - 0.5) * 100;
                    const y1 = x2 * x2 + 2 * x1 * x2;
                    target.set(x1, x2, y1 / this.params.rescaleY);
                }, 100, 100);
                lMesh = new Mesh(lGeometry, lMaterial);
                this.scene.add(lMesh);
                break;
            }
            ballGeometry.translate(points[0].x, points[0].y, points[0].z);
            const dotGeometry = new BufferGeometry().setFromPoints(points);
            const dotMaterial = new PointsMaterial({size: 2, sizeAttenuation: false});
            const dots = new Points(dotGeometry, dotMaterial);
            this.scene.add(dots);
        } else {
            const points: Vector2[] = [];
            switch (this.params.projection2D) {
            case Projection2D.X1X2:
                for (let point of this.orbit) points.push(new Vector2(point.x, point.y));
                axesHelper.setColors(xColor, yColor, white);
                break;
            case Projection2D.X1Y1:
                for (let point of this.orbit) points.push(new Vector2(point.x, point.z / this.params.rescaleY));
                axesHelper.setColors(xColor, zColor, white);
                break;
            case Projection2D.X1Y2:
                for (let point of this.orbit) points.push(new Vector2(point.x, point.w / this.params.rescaleY));
                axesHelper.setColors(xColor, wColor, white);
                break;
            case Projection2D.X2Y1:
                for (let point of this.orbit) points.push(new Vector2(point.y, point.z / this.params.rescaleY));
                axesHelper.setColors(yColor, zColor, white);
                break;
            case Projection2D.X2Y2:
                for (let point of this.orbit) points.push(new Vector2(point.y, point.w / this.params.rescaleY));
                axesHelper.setColors(yColor, wColor, white);
                break;
            case Projection2D.Y1Y2:
                for (let point of this.orbit) points.push(new Vector2(point.z / this.params.rescaleY, point.w / this.params.rescaleY));
                axesHelper.setColors(zColor, wColor, white);
                break;
            }
            const pointGeo = new SphereGeometry(0.03);
            const instancedMesh = new InstancedMesh(pointGeo, new MeshBasicMaterial({color: new Color(0xffffff)}), points.length);
            for (let i = 0; i < points.length; i++) {
                instancedMesh.setMatrixAt(i, new Matrix4().makeTranslation(points[i].x, points[i].y, 0));
            }
            instancedMesh.instanceMatrix.needsUpdate = true;
            this.scene.add(instancedMesh);
            ballGeometry.translate(points[0].x, points[0].y, 0);
            const dotGeometry = new BufferGeometry().setFromPoints(points);
            const dotMaterial = new PointsMaterial({size: 1, sizeAttenuation: false});
            const dots = new Points(dotGeometry, dotMaterial);
            this.scene.add(dots);
        }

        this.scene.add(axesHelper);
        // show the starting point
        const ballMaterial = new MeshBasicMaterial({color: new Color(0xaa0044)});
        const ball = new Mesh(ballGeometry, ballMaterial);
        this.scene.add(ball);
    }
}
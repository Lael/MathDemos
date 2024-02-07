import {Component, OnDestroy} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {
    BufferGeometry,
    Color,
    DoubleSide,
    InstancedMesh,
    Line as ThreeLine,
    LineBasicMaterial,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Points,
    PointsMaterial,
    SphereGeometry,
    Vector2,
    Vector3
} from "three";
import {Triangle} from "../../../math/geometry/triangle";
import {iterate} from "../ticktock/ticktock.component";
import {randFloat, randInt} from "three/src/math/MathUtils";
import {GUI} from "dat.gui";

const SPEED = 0.1;

interface SampleJob {
    index: number,
    triangle: Triangle,
    t: number,
    matrix: Matrix4,
}

interface PhaseJob {
    triangle: Triangle,
    t: number,
}

/*
 * TODO:
 *  1. help
 *  2. Maxim's triangles
 *  3.
 */

@Component({
    selector: 'triangle-map',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class TriangleMapComponent extends ThreeDemoComponent implements OnDestroy {
    orbitControls: OrbitControls;
    space: ThreeLine;
    angleSpace = true;
    start: Object3D;

    v = new Vector2(0, 0.0001);
    startingTriangle = Triangle.fromThreeAngles(Math.PI / 3, Math.PI / 3);
    pts: Points = new Points();
    mesh: InstancedMesh = new InstancedMesh(new BufferGeometry(), new MeshBasicMaterial(), 1);

    print = false;
    debounce = false;

    sampleQueue: SampleJob[] = [];
    phaseQueue: PhaseJob[] = [];

    params = {
        sample: false,
        clear: false,
        phase: false,
        phaseMinRadius: 0.6,
        phaseMaxRadius: 0.9,
        t: 0.4332761727,
        resolution: 6,
        attempts: 10,
        fixArea: true,
        fixPerimeter: false,
    }

    gui: GUI;
    dirty = true;

    constructor() {
        super();
        this.useOrthographic = true;
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.space = new ThreeLine(new BufferGeometry().setFromPoints([
            new Vector3(Math.PI, 0, 0),
            new Vector3(0, Math.PI, 0),
            new Vector3(0, 0, Math.PI),
            new Vector3(Math.PI, 0, 0),
        ]), new LineBasicMaterial({color: 0xffffff}));
        this.camera.position.set(-5, -5, -5);
        this.camera.lookAt(5, 5, 5);
        if (this.params.sample) this.sampleSetup();
        if (this.params.phase) this.phaseSetup();
        this.scene.add(this.space);
        this.gui = new GUI();
        this.updateGUI();
        this.start = new Mesh(new SphereGeometry(0.01), new MeshBasicMaterial({color: 0x44aaff}));
        this.scene.add(this.start);
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();

        this.gui.add(this.params, 'sample').name('Degenerate').onFinishChange(() => {
            if (this.params.sample) {
                this.sampleSetup();
                this.params.phase = false;
                this.params.clear = false;
            }
            this.updateGUI();
        });

        this.gui.add(this.params, 'phase').name('Phase').onFinishChange(() => {
            if (this.params.phase) {
                this.phaseSetup();
                this.params.sample = false;
                this.params.clear = false;
            } else {
                this.scene.add(this.start);
            }
            this.updateGUI();
        });

        this.gui.add(this.params, 'clear').name('Clear').onFinishChange(() => {
            if (this.params.clear) {
                this.params.sample = false;
                this.params.phase = false;
            }
            this.updateGUI();
            this.dirty = true;
        });

        this.gui.add(this.params, 't').min(0.001).max(1).step(0.001).name('t').onChange(() => {
            this.dirty = true;
        }).onFinishChange(() => {
            if (this.params.sample) this.sampleSetup();
            if (this.params.phase) this.phaseSetup();
            this.dirty = true;
        });

        if (this.params.phase) {
            this.gui.add(this.params, 'phaseMinRadius')
                .min(0).max(Math.PI).step(0.01).name('Min sample rad')
                .onFinishChange(() => {
                        if (this.params.phase) this.phaseSetup();
                    }
                );
            this.gui.add(this.params, 'phaseMaxRadius')
                .min(0).max(Math.PI).step(0.01).name('Max sample rad')
                .onFinishChange(() => {
                        if (this.params.phase) this.phaseSetup();
                    }
                );
        }

        this.gui.add(this.params, 'attempts').min(0).max(12).step(1).name('log2(iters)').onFinishChange(() => {
            if (this.params.sample) this.sampleSetup();
            if (this.params.phase) this.phaseSetup();
            this.dirty = true;
        });
        if (this.params.sample || this.params.phase) {
            this.gui.add(this.params, 'resolution').min(2).max(10).step(1).name('log2(res)').onFinishChange(() => {
                if (this.params.sample) this.sampleSetup();
                if (this.params.phase) this.phaseSetup();
            });
        }

        this.gui.add(this.params, 'fixArea').name('Area = 1').onFinishChange(() => {
            this.params.fixPerimeter = !this.params.fixArea;
            this.updateGUI();
            if (this.params.sample) this.sampleSetup();
            if (this.params.phase) this.phaseSetup();
            this.dirty = true;
        });

        this.gui.add(this.params, 'fixPerimeter').name('Perimeter = 1').onFinishChange(() => {
            this.params.fixArea = !this.params.fixArea;
            this.updateGUI();
            if (this.params.sample) this.sampleSetup();
            if (this.params.phase) this.phaseSetup();
            this.dirty = true;
        });

        this.gui.open();
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    processKeyboardInput(dt: number) {
        let multiplier = 1;
        multiplier *= (this.keysPressed.get('ShiftLeft') || this.keysPressed.get('ShiftRight') ? 0.1 : 1);
        multiplier *= (this.keysPressed.get('AltLeft') || this.keysPressed.get('AltRight') ? 0.01 : 1);

        this.showHelp = !!this.keysPressed.get('KeyH');

        let dv = new Vector2();
        if (this.keysPressed.get('ArrowUp')) dv.y += 1;
        if (this.keysPressed.get('ArrowDown')) dv.y -= 1;
        if (this.keysPressed.get('ArrowLeft')) dv.x -= 1;
        if (this.keysPressed.get('ArrowRight')) dv.x += 1;
        if (this.keysPressed.get('KeyL') && !this.debounce) {
            this.print = true;
            this.debounce = true;
        }
        if (!this.keysPressed.get('KeyL')) {
            this.debounce = false;
        }

        if (this.keysPressed.get('KeyC')) {
            this.scene.clear();
            this.scene.add(this.space);
            this.scene.add(this.start);
            this.dirty = true;
        }

        let tv = 0;
        if (this.keysPressed.get('BracketLeft')) tv -= 1;
        if (this.keysPressed.get('BracketRight')) tv += 1;
        if (tv !== 0) {
            this.params.t += tv * multiplier * SPEED * dt;
            this.dirty = true;
            this.updateGUI();
        }

        if (dv.length() != 0) {
            dv.normalize().multiplyScalar(multiplier * SPEED * dt / this.camera.zoom);
            dv.x *= 2;
            this.v.add(dv);
            this.dirty = true;
        }
    }

    override keydown(e: KeyboardEvent) {
        super.keydown(e);
        if (e.code === 'KeyG') {
            this.goToGeometry();
        }
    }

    goToGeometry() {
        window.open('/#/ticktock', '_blank');
    }

    updateStartingTriangle() {
        // let d2 = new Vector2(this.v.y * Math.cos(this.v.x), this.v.y * Math.sin(this.v.x));
        let a = xyToTriSpace(this.v)
        if (a.x <= 0 || a.y <= 0 || a.z <= 0) return;
        this.startingTriangle = Triangle.fromThreeAngles(a.x, a.y, a.z);
        if (this.params.fixArea) {
            this.startingTriangle.withArea();
        } else if (this.params.fixPerimeter) {
            this.startingTriangle.withPerimeter(1);
        }
    }

    iterateExtouch() {
        let t = this.startingTriangle;
        let points;
        if (this.angleSpace) {
            points = [new Vector3(t.angleA, t.angleB, t.angleC)];
        } else {
            points = [new Vector3(t.sideA, t.sideB, t.sideC)];
        }
        for (let i = 0; i < 1000; i++) {
            try {
                t = t.guessTouch();
                let v;
                if (this.angleSpace) {
                    v = new Vector3(t.angleA, t.angleB, t.angleC);
                } else {
                    v = new Vector3(t.sideA, t.sideB, t.sideC);
                }
                points.push(v);
                if (this.print) {
                    const s = (t.sideA + t.sideB + t.sideC) / 3;
                    const l = v.clone().sub(new Vector3(s, s, s)).length();
                    console.log(`${l} ${s}`);
                }
            } catch (e) {
                break;
            }
        }
        this.print = false;

        this.pts = new Points(new BufferGeometry().setFromPoints(points),
            new PointsMaterial({color: 0xffff88, size: 0.025}));
        this.scene.add(this.pts);
    }

    iterateVectorField() {
        const dt = 0.001;
        let t = this.startingTriangle;
        let points;
        if (this.angleSpace) {
            points = [new Vector3(t.angleA, t.angleB, t.angleC)];
        } else {
            points = [new Vector3(t.sideA, t.sideB, t.sideC)];
        }
        for (let i = 0; i < 10000; i++) {
            t = t.evolve(dt);
            let v;
            if (this.angleSpace) {
                v = new Vector3(t.angleA, t.angleB, t.angleC);
            } else {
                v = new Vector3(t.sideA, t.sideB, t.sideC);
            }
            points.push(v);
        }
        this.pts = new Points(new BufferGeometry().setFromPoints(points),
            new PointsMaterial({color: 0xffff88, size: 0.025}));
        this.scene.add(this.pts);
    }

    iterateMap(triangle: Triangle = this.startingTriangle, t: number = this.params.t) {
        let tri = new Triangle(triangle.p1, triangle.p2, triangle.p3);
        let points;
        if (this.angleSpace) {
            points = [new Vector3(tri.angleA, tri.angleB, tri.angleC)];
        } else {
            points = [new Vector3(tri.sideA, tri.sideB, tri.sideC)];
        }
        let failed = false;
        for (let i = 0; i < Math.pow(2, this.params.attempts); i++) {
            let newVertices = [];
            try {
                newVertices = iterate([tri.p1, tri.p2, tri.p3], t);
            } catch (e) {
                failed = true;
                break;
            }
            tri = new Triangle(newVertices[0], newVertices[1], newVertices[2])
            if (this.params.fixPerimeter) tri.withPerimeter(1);
            if (this.params.fixArea) tri.withArea(1);
            let v;
            if (this.angleSpace) {
                v = new Vector3(tri.angleA, tri.angleB, tri.angleC);
            } else {
                v = new Vector3(tri.sideA, tri.sideB, tri.sideC);
            }
            points.push(v);
        }
        let color;
        let size;
        if (this.params.phase) {
            color = new Color().setRGB(randFloat(0.3, 1), randFloat(0.3, 1), randFloat(0.3, 1));
        } else {
            color = new Color().setRGB(1, 1, 1);
        }
        this.pts = new Points(new BufferGeometry().setFromPoints(points),
            new PointsMaterial({color: failed ? new Color().setRGB(1, 0, 0) : color}));
        this.scene.add(this.pts);
        this.dirty = false;
    }

    sampleSetup() {
        this.scene.clear();
        this.scene.add(this.space);
        this.scene.add(this.start);
        this.sampleQueue = [];
        const resolution = Math.pow(2, this.params.resolution);
        const t = this.params.t;
        const scale = Math.PI / resolution;
        this.mesh = new InstancedMesh(
            new BufferGeometry().setFromPoints([
                new Vector3(0, 0, 0),
                new Vector3(scale, 0, -scale),
                new Vector3(0, scale, -scale),
            ]),
            new MeshBasicMaterial({color: 0xffffff, side: DoubleSide}),
            resolution * resolution,
        );

        let i = 0;
        for (let x = 0; x < resolution; x++) {
            for (let y = 0; y < resolution - x; y++) {
                let xCoord = x * scale;
                let yCoord = y * scale;
                let zCoord = Math.PI - xCoord - yCoord;
                const matrix = new Matrix4().makeTranslation(xCoord, yCoord, zCoord);
                this.mesh.setMatrixAt(
                    i, matrix,
                )
                let angleA = (x + 1. / 3) * Math.PI / resolution;
                let angleB = (y + 1. / 3) * Math.PI / resolution;
                let angleC = Math.PI - angleA - angleB;
                let triangle = Triangle.fromThreeAngles(angleA, angleB, angleC);
                if (this.params.fixArea) triangle.withArea();
                if (this.params.fixPerimeter) triangle.withPerimeter(1);
                this.sampleQueue.push({
                    index: i,
                    triangle,
                    t,
                    matrix,
                });
                i++;
            }
        }
        for (let x = 0; x < resolution - 1; x++) {
            for (let y = 0; y < resolution - 1 - x; y++) {
                let xCoord = (x + 1) * scale;
                let yCoord = (y + 1) * scale;
                let zCoord = Math.PI - xCoord - yCoord;
                const matrix = new Matrix4().makeTranslation(xCoord, yCoord, zCoord).multiply(new Matrix4().makeScale(-1, -1, -1));
                this.mesh.setMatrixAt(
                    i, matrix,
                );
                let angleA = (x + 2. / 3) * Math.PI / resolution;
                let angleB = (y + 2. / 3) * Math.PI / resolution;
                let angleC = Math.PI - angleA - angleB;
                let triangle = Triangle.fromThreeAngles(angleA, angleB, angleC);
                if (this.params.fixArea) triangle.withArea();
                if (this.params.fixPerimeter) triangle.withPerimeter(1);
                this.sampleQueue.push({
                    index: i,
                    triangle,
                    t,
                    matrix,
                });
                i++;
            }
        }
        this.mesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.mesh);
        shuffle(this.sampleQueue);
    }

    phaseSetup() {
        this.scene.clear();
        this.scene.add(this.space);
        this.scene.add(this.start);
        this.sampleQueue = [];
        this.phaseQueue = [];
        const resolution = Math.pow(2, this.params.resolution);
        const t = this.params.t;
        for (let r = this.params.phaseMinRadius; r < this.params.phaseMaxRadius; r += 1 / resolution) {
            const offset = randFloat(0, 2 * Math.PI);
            const dTheta = 2 * Math.PI / resolution * this.params.phaseMaxRadius / r;
            for (let theta = 0; theta < 2 * Math.PI; theta += dTheta) {
                let d2 = new Vector2(r * Math.cos(theta + offset), r * Math.sin(theta + offset));
                let d3 = new Vector3(-1, 1, 0).normalize().multiplyScalar(d2.y)
                    .add(new Vector3(-1, -1, 2).normalize().multiplyScalar(d2.x));
                let a = new Vector3(Math.PI / 3, Math.PI / 3, Math.PI / 3).add(d3);
                if (a.x <= 0 || a.y <= 0 || a.z <= 0) continue;
                let triangle = Triangle.fromThreeAngles(a.x, a.y, a.z);
                if (this.params.fixArea) {
                    triangle.withArea();
                } else if (this.params.fixPerimeter) {
                    triangle.withPerimeter(1);
                }
                this.phaseQueue.push({
                    triangle,
                    t, // Try using t corresponding to area
                });
            }
        }
        shuffle(this.phaseQueue);
    }

    frame(dt: number): void {
        if (this.params.sample) {
            if (this.sampleQueue.length === 0) return;
            const start = Date.now();
            let now = Date.now();
            while (now < start + 40 && this.sampleQueue.length > 0) {
                const job = this.sampleQueue.pop();
                if (job === undefined) continue;
                const success = testEvasion([job.triangle.p1, job.triangle.p2, job.triangle.p3], job.t, Math.pow(2, this.params.attempts));
                const successColor = new Color(0x759AAB);
                const failureColor = new Color(0x931621);
                const color = successColor.multiplyScalar(success).add(failureColor.multiplyScalar(1 - success));
                this.mesh.setMatrixAt(job.index, job.matrix);
                this.mesh.setColorAt(job.index, color);
                now = Date.now();
            }
            if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
        } else if (this.params.phase) {
            if (this.phaseQueue.length === 0) return;
            console.log(this.phaseQueue.length);
            const start = Date.now();
            let now = Date.now();
            while (now < start + 8 && this.phaseQueue.length > 0) {
                const job = this.phaseQueue.pop();
                if (job === undefined) continue;
                this.iterateMap(job.triangle, job.t);
                now = Date.now();
            }
        } else {
            this.processKeyboardInput(dt);
            const z = 1 / this.camera.zoom;
            this.start.scale.set(z, z, z);
            if (this.dirty) {
                if (this.params.clear) {
                    this.scene.clear();
                    this.scene.add(this.space);
                    this.scene.add(this.start);
                }
                this.updateStartingTriangle();
                console.clear();
                console.log(this.startingTriangle.perimeter);
                console.log(this.startingTriangle.p1);
                console.log(this.startingTriangle.p2);
                console.log(this.startingTriangle.p3);
                this.iterateMap();
                this.start.position.set(this.startingTriangle.angleA, this.startingTriangle.angleB, this.startingTriangle.angleC);
            }
        }
    }

    override help(): String {
        return super.help();
    }
}

function testEvasion(vertices: Vector2[], t: number, attempts: number): number {
    let i = 0;
    try {
        for (; i < attempts; i++) {
            vertices = iterate(vertices, t);
        }
    } catch (_) {
        return i / attempts;
    }
    return 1;
}

function xyToTriSpace(xy: Vector2): Vector3 {
    let d3 = new Vector3(-1, 0, 1).normalize().multiplyScalar(xy.x / Math.sqrt(6))
        .add(new Vector3(-1, 2, -1).normalize().multiplyScalar(xy.y));
    return new Vector3(Math.PI / 3, Math.PI / 3, Math.PI / 3).add(d3);
}

function shuffle(l: any[]) {
    let n = l.length;
    for (let i = 1; i < n; i++) {
        let r = randInt(i, n);
        let t = l[i];
        l[i] = l[r];
        l[r] = t;
    }
}
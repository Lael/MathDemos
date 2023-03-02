import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import * as THREE from 'three';
import {BufferGeometry, Matrix4, Vector2, Vector3} from 'three';
import * as dat from 'dat.gui';
import {Duality, Flavor, Plane} from "../../../math/billiards/billiards";
import {NewAffinePolygonTable} from "../../../math/billiards/new-affine-polygon-table";
import {NewHyperbolicPolygonTable} from "../../../math/billiards/new-hyperbolic-polygon-table"
import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {Complex} from "../../../math/complex";
import {fixTime} from "../../../math/billiards/tables";

// Colors
const CLEAR_COLOR = 0x0a2933;
const FILL_COLOR = 0xf9f4e9;
const CHORDS_COLOR = 0x000000;
const OUTER_ORBIT_COLOR = 0x2a9d8f;
const SINGULARITY_COLOR = 0xe76f51;
const POINT_COLOR = 0xe76f51;

// Other constants
const CAMERA_SPEED_XY = 0.1; // world-space units/second at z=1
const CAMERA_SPEED_Z = 0.25; // world-space units/second at z=1
const OUTER_POINT_SPEED = 0.001; // world-space units/second
const NUM_WORKERS = 1;

@Component({
    selector: 'new-billiards',
    template: '',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class NewBilliardsComponent extends ThreeDemoComponent {

    // Parameters
    billiardTypeParams = {
        duality: 'Outer',
        flavor: 'Standard',
        plane: 'Hyperbolic',
    };

    tableParams = {
        n: 3,
        radius: 1,
    };

    drawParams = {
        model: 'Poincaré',
        singularities: true,
        singularityIterations: 50,
        orbit: true,
        orbitPaths: true,
    }

    gameParams = {
        iterations: 12,
        startTime: 0.123,
        angle: 0.456,
    }


    // When to update stuff
    tableDirty = true;
    singularityDirty = true;
    orbitDirty = true;
    drawDirty = true;

    gui: dat.GUI;

    // Stuff on the screen
    hyperbolicDisk: THREE.Line;
    polygonBorder = new THREE.Line();
    polygon = new THREE.Mesh();
    orbit = new THREE.Object3D();
    singularities = new THREE.Object3D();
    startPoint = new THREE.Mesh();

    // Billiards
    affineTable!: NewAffinePolygonTable;
    hyperbolicTable!: NewHyperbolicPolygonTable;
    affineOuterStart: Vector2 = new Vector2(1, 1);
    hyperOuterStart: HyperPoint = HyperPoint.fromPoincare(new Vector2(0.5, 0.5));

    // Multithreading
    hyperWorkers: Worker[] = [];

    constructor() {
        super();


        for (let i = 0; i < NUM_WORKERS; i++) {
            const worker = new Worker(new URL('./hyper.worker', import.meta.url), {type: "module"});
            this.hyperWorkers.push(worker);
        }

        this.renderer.setClearColor(CLEAR_COLOR);

        const path = new THREE.Path();

        path.absellipse(0, 0, 1, 1, 0, 2 * Math.PI, true, 0);

        const points = path.getPoints(128);

        const diskGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const diskMaterial = new THREE.LineBasicMaterial({color: SINGULARITY_COLOR});

        this.hyperbolicDisk = new THREE.Line(diskGeometry, diskMaterial);

        const pointGeometry = new THREE.CircleGeometry(0.025, 32);
        const pointMaterial = new THREE.MeshBasicMaterial({color: POINT_COLOR});

        this.startPoint = new THREE.Mesh(pointGeometry, pointMaterial);

        this.gui = new dat.GUI();
        this.updateGUI();
    }

    private processKeyboardInput(): void {
        // Camera
        const cameraDiff = new Vector3();
        if (this.keysPressed.get('KeyW')) cameraDiff.y += 1;
        if (this.keysPressed.get('KeyA')) cameraDiff.x -= 1;
        if (this.keysPressed.get('KeyS')) cameraDiff.y -= 1;
        if (this.keysPressed.get('KeyD')) cameraDiff.x += 1;
        if (cameraDiff.length() !== 0) cameraDiff.normalize();
        cameraDiff.multiplyScalar(this.camera.position.z * CAMERA_SPEED_XY / 60);
        if (this.keysPressed.get('Space')) cameraDiff.z += this.camera.position.z * CAMERA_SPEED_Z / 60;
        if (this.keysPressed.get('ShiftLeft')) cameraDiff.z -= this.camera.position.z * CAMERA_SPEED_Z / 60;
        this.camera.position.add(cameraDiff);

        // Test point
        const pointDiff = new Vector2();
        if (this.keysPressed.get('ArrowLeft')) pointDiff.x -= 1;
        if (this.keysPressed.get('ArrowRight')) pointDiff.x += 1;
        if (this.keysPressed.get('ArrowUp')) pointDiff.y += 1;
        if (this.keysPressed.get('ArrowDown')) pointDiff.y -= 1;
        if (pointDiff.length() === 0) return;
        pointDiff.normalize();
        if (this.duality === Duality.OUTER) {
            const startPointDiff = pointDiff.multiplyScalar(OUTER_POINT_SPEED * this.camera.position.z);
            if (this.plane === Plane.AFFINE) {
                this.affineOuterStart.add(startPointDiff);
                this.orbitDirty = true;
            } else {
                const current = this.hyperOuterStart.resolve(this.model);
                const diff = startPointDiff.multiplyScalar(1 / (1 + current.modulusSquared()));
                const newPoint = current.plus(Complex.fromVector2(diff));
                if (newPoint.modulusSquared() > 0.999) return;
                this.hyperOuterStart = new HyperPoint(newPoint, this.model);
                this.orbitDirty = true;
            }
        } else {
            this.gameParams.startTime += pointDiff.x * 0.0001;
            this.gameParams.startTime = fixTime(this.gameParams.startTime);
            this.gameParams.angle += pointDiff.y * 0.0001;
            this.gameParams.angle = fixTime(this.gameParams.angle);
            this.orbitDirty = true;
            this.updateGUI();
        }
    }

    override frame() {
        this.processKeyboardInput();

        if (this.tableDirty) this.updateTable();
        if (this.singularityDirty) this.updateSingularities();
        if (this.orbitDirty) this.updateOrbit();
        if (this.drawDirty) this.updateDraw();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const billiardFolder = this.gui.addFolder('Billiard Type');
        billiardFolder.add(this.billiardTypeParams, 'duality', ['Inner', 'Outer'])
            .name('Duality')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.add(this.billiardTypeParams, 'flavor', ['Standard', 'Symplectic'])
            .name('Flavor')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.add(this.billiardTypeParams, 'plane', ['Affine', 'Hyperbolic'])
            .name('Plane')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.open();

        const tableFolder = this.gui.addFolder('Table');
        tableFolder.add(this.tableParams, 'n')
            .min(3).max(12).step(1).name('n')
            .onFinishChange(this.updateTableParams.bind(this));
        if (this.plane === Plane.HYPERBOLIC) {
            tableFolder.add(this.tableParams, 'radius')
                .min(0.01).max(2).step(0.01).name('Radius')
                .onChange(this.updateTableParams.bind(this));
        }
        tableFolder.open();

        const drawFolder = this.gui.addFolder('Drawing');
        if (this.plane === Plane.HYPERBOLIC) {
            drawFolder.add(this.drawParams, 'model', ['Poincaré', 'Klein'])
                .name('Model').onFinishChange(this.updateDrawParams.bind(this));
        }
        if (this.duality === Duality.OUTER) {
            drawFolder.add(this.drawParams, 'singularities').name('Singularities').onFinishChange(
                this.markDrawDirty.bind(this));
            drawFolder.add(this.drawParams, 'singularityIterations').name('Iterations')
                .min(0).max(250).step(1)
                .onFinishChange(this.markSingularityDirty.bind(this));
        }
        drawFolder.add(this.drawParams, 'orbitPaths').name('Orbit Paths').onFinishChange(
            this.markOrbitDirty.bind(this));
        drawFolder.open();


        const gameFolder = this.gui.addFolder('Game');
        if (this.duality === Duality.INNER) {
            gameFolder.add(this.gameParams, 'startTime')
                .min(0).max(1).step(0.01).name('Start time')
                .onChange(() => {
                    this.orbitDirty = true;
                });
            gameFolder.add(this.gameParams, 'angle')
                .min(0.01).max(0.99).step(0.01).name('Angle')
                .onChange(() => {
                    this.orbitDirty = true;
                });
        }
        gameFolder.add(this.gameParams, 'iterations')
            .min(1).max(15).step(1).name('Iterations (log)')
            .onChange(() => {
                this.orbitDirty = true;
            });
        gameFolder.open();

        this.gui.open();
    }

    updateBilliardTypeParams() {
        this.updateGUI();
        this.updateTableParams();
    }

    updateTableParams() {
        this.tableDirty = true;
    }

    updateDrawParams() {
        switch (this.plane) {
            case Plane.AFFINE:
                this.scene.remove(this.hyperbolicDisk);
                this.updateTable();
                break;
            case Plane.HYPERBOLIC:
                this.updateTable();
                this.scene.add(this.hyperbolicDisk);
                break;
            default:
                throw Error('Unknown plane type:' + this.billiardTypeParams.plane);
        }
    }

    markSingularityDirty() {
        this.singularityDirty = true;
    }

    markOrbitDirty() {
        this.orbitDirty = true;
    }

    markDrawDirty() {
        this.drawDirty = true;
    }

    updateTable() {
        this.tableDirty = false;

        this.scene.remove(this.polygon);
        this.scene.remove(this.polygonBorder);
        let vertices: Vector2[];
        switch (this.plane) {
            case Plane.AFFINE:
                vertices = this.affinePoints();
                this.affineTable = new NewAffinePolygonTable(vertices);
                break;
            case Plane.HYPERBOLIC:
                const hyperPoints = this.hyperbolicPoints();
                this.hyperbolicTable = new NewHyperbolicPolygonTable(hyperPoints);
                for (let worker of this.hyperWorkers) {
                    worker.addEventListener('message', this.hyperbolicTable.onWorkerMessage.bind(this.hyperbolicTable));
                    worker.addEventListener('error', this.hyperbolicTable.onWorkerError.bind(this.hyperbolicTable));
                }
                vertices = this.hyperbolicTable.interpolateVertices(this.model);
                break;
            default:
                throw Error('Unknown plane type:' + this.billiardTypeParams.plane);
        }

        if (this.duality === Duality.INNER && this.singularities) this.scene.remove(this.singularities);

        let shape = new THREE.Shape(vertices);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({color: FILL_COLOR});
        this.polygon = new THREE.Mesh(geometry, material);
        this.scene.add(this.polygon);

        const edgeMaterial = new THREE.MeshBasicMaterial({color: SINGULARITY_COLOR});
        const edgeGeometry = new BufferGeometry().setFromPoints(vertices.concat([vertices[0]]));
        this.polygonBorder = new THREE.Line(edgeGeometry, edgeMaterial);
        this.scene.add(this.polygonBorder);

        this.singularityDirty = true;
        this.orbitDirty = true;
        this.drawDirty = true;
    }

    updateSingularities() {
        this.singularityDirty = false;
        this.scene.remove(this.singularities);
        this.singularities = new THREE.Object3D();
        if (this.duality !== Duality.OUTER) return;
        let preimages;
        let points: Vector2[];
        const material = new THREE.LineBasicMaterial({
            color: SINGULARITY_COLOR,
        });
        const geometry = new THREE.BufferGeometry();
        switch (this.plane) {
            case Plane.AFFINE:
                preimages = this.affineTable.preimages(this.flavor, this.drawParams.singularityIterations);
                points = [];
                for (let preimage of preimages) {
                    points.push(preimage.start);
                    if (preimage.infinite) {
                        const diff = preimage.end.clone().sub(preimage.start);
                        const far = preimage.start.clone().add(diff.normalize().multiplyScalar(100));
                        points.push(far);
                    } else {
                        points.push(preimage.end);
                    }
                }

                geometry.setFromPoints(points);

                this.singularities = new THREE.LineSegments(geometry, material);
                break;
            case Plane.HYPERBOLIC:
                preimages = this.hyperbolicTable.preimages(this.flavor, this.drawParams.singularityIterations, this.hyperWorkers);
                points = [];
                for (let preimage of preimages) {
                    const preimagePoints = preimage.interpolate(this.model, preimage.start, true).map(c => c.toVector2());
                    for (let i = 0; i < preimagePoints.length - 1; i++) {
                        points.push(preimagePoints[i]);
                        points.push(preimagePoints[i + 1]);
                    }
                }
                geometry.setFromPoints(points);
                this.singularities = new THREE.LineSegments(geometry, material);
                break;
            default:
                throw Error('Unknown plane');
        }

        this.drawDirty = true;
    }

    updateOrbit() {
        this.orbitDirty = false;
        this.drawDirty = true;
        this.scene.remove(this.orbit);
        this.scene.remove(this.startPoint);
        let startPointPosition: Vector2;
        let geometry;
        let material;
        switch (this.plane) {
            case Plane.AFFINE:
                switch (this.duality) {
                    case Duality.INNER:
                        const chords = this.affineTable.iterateInner(
                            {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI},
                            this.flavor,
                            this.iterations,
                        );
                        if (chords.length === 0) {
                            this.orbit = new THREE.Object3D();
                            return;
                        }
                        const points = chords.map(chord => chord.p1);
                        points.push(chords[chords.length - 1].p2);

                        startPointPosition = points[0];

                        geometry = new THREE.BufferGeometry().setFromPoints(points);
                        material = new THREE.LineBasicMaterial({color: CHORDS_COLOR});

                        this.orbit = new THREE.Line(geometry, material);
                        break;
                    case Duality.OUTER:
                        const orbit = this.affineTable.iterateOuter(this.affineOuterStart, this.flavor, this.iterations);
                        startPointPosition = orbit[0];

                        if (this.drawParams.orbitPaths) {
                            geometry = new THREE.BufferGeometry().setFromPoints(orbit);
                            material = new THREE.LineBasicMaterial({color: OUTER_ORBIT_COLOR});
                            this.orbit = new THREE.Line(geometry, material);
                        } else {
                            geometry = new THREE.CircleGeometry(0.01, 16);
                            material = new THREE.MeshBasicMaterial({color: OUTER_ORBIT_COLOR});
                            this.orbit = new THREE.InstancedMesh(geometry, material, orbit.length);
                            for (let i = 0; i < orbit.length; i++) {
                                (this.orbit as THREE.InstancedMesh)
                                    .setMatrixAt(i, new Matrix4().makeTranslation(orbit[i].x, orbit[i].y, 0));
                            }
                            (this.orbit as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                        }
                        break;
                    default:
                        throw Error('Unknown duality');
                }
                break;
            case Plane.HYPERBOLIC:
                let points: Vector2[];
                switch (this.duality) {
                    case Duality.INNER:
                        const chords = this.hyperbolicTable.iterateInner(
                            {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI},
                            this.flavor,
                            this.iterations);
                        points = [];
                        for (let chord of chords) {
                            points.push(...chord.interpolate(this.model, chord.start).map(c => c.toVector2()));
                        }
                        if (chords.length === 0) {
                            this.orbit = new THREE.Object3D();
                            return;
                        }
                        geometry = new THREE.BufferGeometry().setFromPoints(points);
                        material = new THREE.LineBasicMaterial({color: CHORDS_COLOR});
                        this.orbit = new THREE.Line(geometry, material);
                        startPointPosition = chords[0].start.resolve(this.model).toVector2();
                        break;
                    case Duality.OUTER:
                        const orbit = this.hyperbolicTable.iterateOuter(this.hyperOuterStart, this.flavor, this.iterations);
                        startPointPosition = orbit[0].resolve(this.model).toVector2();

                        if (this.drawParams.orbitPaths) {
                            points = [];
                            for (let i = 0; i < orbit.length - 1; i++) {
                                const o1 = orbit[i];
                                const o2 = orbit[i + 1];
                                const g = new HyperGeodesic(o1, o2);
                                points.push(...g.interpolate(
                                    this.model,
                                    g.start,
                                    true).map(c => c.toVector2()));
                            }
                            geometry = new THREE.BufferGeometry().setFromPoints(points);
                            material = new THREE.LineBasicMaterial({color: OUTER_ORBIT_COLOR});
                            this.orbit = new THREE.Line(geometry, material);
                        } else {
                            geometry = new THREE.CircleGeometry(0.005, 16);
                            material = new THREE.MeshBasicMaterial({color: OUTER_ORBIT_COLOR});
                            this.orbit = new THREE.InstancedMesh(geometry, material, orbit.length);
                            for (let i = 0; i < orbit.length; i++) {
                                (this.orbit as THREE.InstancedMesh)
                                    .setMatrixAt(i, new Matrix4().makeTranslation(
                                        orbit[i].resolve(this.model).x,
                                        orbit[i].resolve(this.model).y,
                                        0));
                            }
                            (this.orbit as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                        }
                        break;
                    default:
                        throw Error('Unknown duality');
                }
                break;
            default:
                throw Error('Unknown plane');
        }
        this.startPoint.translateX(startPointPosition.x - this.startPoint.position.x);
        this.startPoint.translateY(startPointPosition.y - this.startPoint.position.y);

        this.drawDirty = true;
    }

    updateDraw() {
        this.drawDirty = false;

        if (this.plane === Plane.HYPERBOLIC) this.scene.add(this.hyperbolicDisk);
        else this.scene.remove(this.hyperbolicDisk);

        if (this.duality === Duality.OUTER) this.scene.add(this.singularities);
        else this.scene.remove(this.singularities);

        if (this.drawParams.orbit) this.scene.add(this.orbit);
        this.scene.add(this.startPoint);
    }

    get plane(): Plane {
        return this.billiardTypeParams.plane === 'Affine' ? Plane.AFFINE : Plane.HYPERBOLIC;
    }

    get duality(): Duality {
        return this.billiardTypeParams.duality === 'Inner' ? Duality.INNER : Duality.OUTER;
    }

    get flavor(): Flavor {
        return this.billiardTypeParams.flavor === 'Standard' ? Flavor.REGULAR : Flavor.SYMPLECTIC;
    }

    get model(): HyperbolicModel {
        return this.drawParams.model === 'Poincaré' ? HyperbolicModel.POINCARE : HyperbolicModel.KLEIN;
    }

    get iterations(): number {
        return Math.pow(2, this.gameParams.iterations - 1) - 1
    }

    private affinePoints(): Vector2[] {
        const points = [];
        const n = this.tableParams.n;
        const dtheta = Math.PI * 2 / n;
        const offset = Math.PI / n - Math.PI / 2;
        for (let i = 0; i < n; i++) {
            const theta = i * dtheta + offset;
            const c = Complex.polar(1, theta);
            points.push(c.toVector2());
        }
        return points;
    }

    private hyperbolicPoints(): HyperPoint[] {
        const points = [];
        const n = this.tableParams.n;
        const r = this.tableParams.radius;
        const dtheta = Math.PI * 2 / n;
        const offset = Math.PI / n - Math.PI / 2;
        for (let i = 0; i < n; i++) {
            const theta = i * dtheta + offset;
            const c = Complex.polar(HyperPoint.trueToPoincare(r), theta);
            points.push(HyperPoint.fromPoincare(c));
        }
        return points;
    }
}
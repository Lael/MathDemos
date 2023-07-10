import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import * as THREE from 'three';
import {
    BoxGeometry,
    BufferGeometry,
    CircleGeometry,
    Color,
    InstancedMesh,
    LineBasicMaterial,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Shape,
    Vector2,
    Vector3
} from 'three';
import * as dat from 'dat.gui';
import {Duality, Flavor, Plane} from "../../../math/billiards/new-billiard";
import {NewAffinePolygonTable} from "../../../math/billiards/new-affine-polygon-table";
import {NewHyperbolicPolygonTable} from "../../../math/billiards/new-hyperbolic-polygon-table"
import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {Complex} from "../../../math/complex";
import {fixTime} from "../../../math/billiards/tables";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DragControls} from "three/examples/jsm/controls/DragControls";
import {AffineSemicircleTable} from "../../../math/billiards/affine-semicircle-table";
import {clamp} from "three/src/math/MathUtils";
import {normalizeAngle} from "../../../math/math-helpers";

// Colors
const CLEAR_COLOR = 0x0a2933;
const FILL_COLOR = 0xf9f4e9;
const CHORDS_COLOR = 0x000000;
const OUTER_ORBIT_COLOR = 0x3adecb;
const SINGULARITY_COLOR = 0xff7f5e;
const START_POINT_COLOR = 0x51e76f;
const END_POINT_COLOR = 0x6f51e7;
const SCAFFOLD_COLOR = 0xffbbff;
const HANDLE_COLOR = 0x990044;
const CIRCLE_CENTER_COLOR = 0xf5dd90;
const TP_CENTER_COLOR = 0xf590dd;

// Other constants
const CAMERA_SPEED_XY = 0.1; // world-space units/second at z=1
const CAMERA_SPEED_Z = 0.25; // world-space units/second at z=1
const OUTER_POINT_SPEED = 0.001; // world-space units/second
const NUM_WORKERS = 64;

@Component({
    selector: 'new-billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class NewBilliardsComponent extends ThreeDemoComponent {

    orbitControls: OrbitControls;
    dragControls: DragControls;
    draggables: Object3D[] = [];
    dragging = false;

    // Parameters
    billiardTypeParams = {
        duality: 'Outer',
        flavor: 'Length',
        plane: 'Affine',
    };

    tableParams = {
        n: 3,
        radius: 1,
        semidisk: false,
    };

    drawParams = {
        model: 'Poincaré',
        singularities: false,
        singularityIterations: 0,
        orbit: true,
        orbitPaths: true,
        derivative: false,
        derivativeBound: 5,
        derivativeStep: -1,
        scaffold: false,
        centers: false,
    }

    gameParams = {
        iterations: 1,
        startTime: 0.123,
        angle: 0.456,
        tilingPolygon: 0,
    }

    // When to update stuff
    tableDirty = true;
    singularityDirty = true;
    derivativeDirty = true;
    orbitDirty = true;
    drawDirty = true;

    gui: dat.GUI;

    // Stuff on the screen
    hyperbolicDisk: THREE.Line;
    polygonBorder = new THREE.Line();
    polygon = new THREE.Mesh();
    orbit = new THREE.Object3D();
    centers = new THREE.Object3D();
    singularities = new THREE.Object3D();
    derivatives = new THREE.Object3D();
    startPoint = new THREE.Mesh();
    nextPoint = new THREE.Mesh();
    scaffold: THREE.Object3D[] = [];
    semidisk: THREE.Mesh;

    // Billiards
    affineTable!: NewAffinePolygonTable;
    hyperbolicTable!: NewHyperbolicPolygonTable;
    semiDiskTable = new AffineSemicircleTable();
    affineOuterStart: Vector2 = new Vector2(-4, 1);
    hyperOuterStart: HyperPoint = HyperPoint.fromPoincare(new Vector2(0.5, 0.5));

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;
        this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('dragstart', this.affineVertexDragStart.bind(this));
        this.dragControls.addEventListener('drag', this.affineVertexDrag.bind(this));
        this.dragControls.addEventListener('dragend', this.affineVertexDragEnd.bind(this));

        this.renderer.setClearColor(CLEAR_COLOR);

        const path = new THREE.Path();

        path.absellipse(0, 0, 1, 1, 0, 2 * Math.PI, true, 0);

        const points = path.getPoints(128);

        const diskGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const diskMaterial = new THREE.LineBasicMaterial({color: SINGULARITY_COLOR});

        this.hyperbolicDisk = new THREE.Line(diskGeometry, diskMaterial);

        const semiDiskPoints = [];
        for (let i = 0; i <= 90; i++) {
            semiDiskPoints.push(new Vector2(
                Math.cos(i / 90 * Math.PI),
                Math.sin(i / 90 * Math.PI),
            ));
        }

        const semiDiskGeometry = new THREE.ShapeGeometry(new Shape(semiDiskPoints));
        const semiDiskMaterial = new THREE.LineBasicMaterial({color: FILL_COLOR});

        this.semidisk = new Mesh(semiDiskGeometry, semiDiskMaterial);

        const startPointGeometry = new THREE.CircleGeometry(0.025, 32);
        const nextPointGeometry = new THREE.CircleGeometry(0.025, 16);
        const startPointMaterial = new THREE.MeshBasicMaterial({color: START_POINT_COLOR});
        const endPointMaterial = new THREE.MeshBasicMaterial({color: END_POINT_COLOR});

        this.startPoint = new THREE.Mesh(startPointGeometry, startPointMaterial);
        this.nextPoint = new THREE.Mesh(nextPointGeometry, endPointMaterial);

        this.resetAffineVertices();

        this.gui = new dat.GUI();
        this.updateGUI();
    }

    private processKeyboardInput(dt: number): void {
        // Camera
        // const cameraDiff = new Vector3();
        // if (this.keysPressed.get('KeyW')) cameraDiff.y += 1;
        // if (this.keysPressed.get('KeyA')) cameraDiff.x -= 1;
        // if (this.keysPressed.get('KeyS')) cameraDiff.y -= 1;
        // if (this.keysPressed.get('KeyD')) cameraDiff.x += 1;
        // if (cameraDiff.length() !== 0) cameraDiff.normalize();
        // cameraDiff.multiplyScalar(this.perspectiveCamera.position.z * CAMERA_SPEED_XY / 60);
        // if (this.keysPressed.get('Space')) cameraDiff.z += this.perspectiveCamera.position.z * CAMERA_SPEED_Z / 60;
        // if (this.keysPressed.get('ShiftLeft')) cameraDiff.z -= this.perspectiveCamera.position.z * CAMERA_SPEED_Z / 60;
        // this.perspectiveCamera.position.add(cameraDiff);

        // Test point
        const pointDiff = new Vector2();
        if (this.keysPressed.get('ArrowLeft')) pointDiff.x -= 1;
        if (this.keysPressed.get('ArrowRight')) pointDiff.x += 1;
        if (this.keysPressed.get('ArrowUp')) pointDiff.y += 1;
        if (this.keysPressed.get('ArrowDown')) pointDiff.y -= 1;
        if (pointDiff.length() === 0) return;
        pointDiff.normalize();
        if (this.keysPressed.get('ShiftLeft')) pointDiff.multiplyScalar(0.1);
        if (this.keysPressed.get('AltLeft')) pointDiff.multiplyScalar(0.01);
        if (this.duality === Duality.OUTER) {
            const startPointDiff = pointDiff.multiplyScalar(0.5 * dt / this.orthographicCamera.zoom);
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
            this.gameParams.startTime += pointDiff.x * 0.05 * dt;
            this.gameParams.startTime = fixTime(this.gameParams.startTime);
            this.gameParams.angle += pointDiff.y * 0.05 * dt;
            this.gameParams.angle = fixTime(this.gameParams.angle);
            this.orbitDirty = true;
            this.updateGUI();
        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);

        if (this.tableDirty) this.updateTable();
        if (this.singularityDirty) this.updateSingularities();
        if (this.plane === Plane.HYPERBOLIC && this.duality === Duality.OUTER && this.hyperbolicTable.fresh) {
            this.drawHyperbolicPreimages(this.hyperbolicTable.singularities);
            this.hyperbolicTable.fresh = false;
        }
        if (this.derivativeDirty) this.updateDerivatives();
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
        billiardFolder.add(this.billiardTypeParams, 'flavor', ['Length', 'Area'])
            .name('Flavor')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.add(this.billiardTypeParams, 'plane', ['Affine', 'Hyperbolic'])
            .name('Plane')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.open();

        const tableFolder = this.gui.addFolder('Table');
        tableFolder.add(this.tableParams, 'n')
            .min(2).max(12).step(1).name('n')
            .onFinishChange(this.updateTableParams.bind(this));
        if (this.plane === Plane.HYPERBOLIC) {
            tableFolder.add(this.tableParams, 'radius')
                .min(0.01).max(2).step(0.01).name('Radius')
                .onChange(() => {
                    this.gameParams.tilingPolygon = 0;
                    this.updateTableParams();
                });
        }
        if (this.plane === Plane.AFFINE && this.duality === Duality.OUTER) {
            tableFolder.add(this.tableParams, 'semidisk').name('Semi-disk')
                .onFinishChange(this.updateTableParams.bind(this));
        }
        tableFolder.open();

        const drawFolder = this.gui.addFolder('Drawing');
        if (this.flavor !== Flavor.REGULAR) {
            drawFolder.add(this.drawParams, 'scaffold').name('Scaffold').onFinishChange(
                this.markOrbitDirty.bind(this));
            drawFolder.add(this.drawParams, 'centers').name('Centers').onFinishChange(
                this.markOrbitDirty.bind(this));
        }
        if (this.plane === Plane.HYPERBOLIC) {
            drawFolder.add(this.drawParams, 'model', ['Poincaré', 'Klein'])
                .name('Model').onFinishChange(this.updateDrawParams.bind(this));
        }
        if (this.duality === Duality.OUTER) {
            drawFolder.add(this.drawParams, 'singularities').name('Singularities').onFinishChange(
                this.markDrawDirty.bind(this));
            drawFolder.add(this.drawParams, 'singularityIterations').name('Iterations')
                .min(0).max(1000).step(1)
                .onFinishChange(this.markSingularityDirty.bind(this));
            drawFolder.add(this.drawParams, 'derivative').name('Derivative')
                .onFinishChange(this.updateDerivativeParams.bind(this));
            drawFolder.add(this.drawParams, 'derivativeBound').name('Der. bound')
                .min(1).max(50).step(1)
                .onFinishChange(this.markDerivativeDirty.bind(this));
            drawFolder.add(this.drawParams, 'derivativeStep').name('Der. step (log)')
                .min(-8).max(0).step(1)
                .onFinishChange(this.markDerivativeDirty.bind(this));
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
            .min(1).max(20).step(1).name('Iterations (log)')
            .onChange(() => {
                this.orbitDirty = true;
            });
        if (this.duality === Duality.OUTER && this.flavor === Flavor.REGULAR && this.plane === Plane.HYPERBOLIC) {
            gameFolder.add(this.gameParams, 'tilingPolygon')
                .min(3).max(20).step(1).name('Tiling').onFinishChange(this.makeTiling.bind(this));
        }
        gameFolder.open();

        this.gui.open();
    }

    makeTiling() {
        if (!(this.duality === Duality.OUTER && this.flavor === Flavor.REGULAR && this.plane === Plane.HYPERBOLIC)) {
            return;
        }
        const n = this.tableParams.n;
        const k = this.gameParams.tilingPolygon;
        const nint = (n - 2) * Math.PI / n;
        const kint = (k - 2) * Math.PI / k;
        if (2 * nint + 2 * kint <= 2 * Math.PI) return;

        const kext = 2 * n * Math.PI / k;

        const t = Math.tan(Math.PI / n) * Math.tan(kext / (2 * n));
        const po = Math.sqrt((1 - t) / (1 + t));
        const ko = HyperPoint.poincareToKlein(po);
        const kl = ko * Math.cos(Math.PI / n);

        this.tableParams.radius = HyperPoint.kleinToTrue(kl); // something
        this.updateBilliardTypeParams();
    }

    updateBilliardTypeParams() {
        this.updateTableParams();
    }

    updateDerivativeParams() {
        if (this.drawParams.derivative) {
            this.derivativeDirty = true;
        } else {
            this.scene.remove(this.derivatives);
        }
        this.drawDirty = true;
    }

    updateTableParams() {
        this.updateGUI();
        this.tableDirty = true;
        this.resetAffineVertices();
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

    markDerivativeDirty() {
        if (this.drawParams.derivative) this.derivativeDirty = true;
    }

    markOrbitDirty() {
        this.orbitDirty = true;
    }

    markDrawDirty() {
        this.drawDirty = true;
    }

    resetAffineVertices() {
        const points = [];
        this.scene.remove(...this.draggables);
        while (this.draggables.length) this.draggables.pop();
        if (this.tableParams.semidisk) {
            for (let i = 0; i <= 90; i++) {
                points.push(new Vector2(
                    Math.cos(i * Math.PI / 90),
                    Math.sin(i * Math.PI / 90)
                ));
            }
        } else if (this.plane === Plane.AFFINE) {
            const n = this.tableParams.n;
            const dtheta = Math.PI * 2 / n;
            const offset = Math.PI / n - Math.PI / 2;
            for (let i = 0; i < n; i++) {
                const theta = i * dtheta + offset;
                const c = Complex.polar(1, theta);
                points.push(c.toVector2());
            }
            for (let p of points) {
                const dot = new Mesh(
                    new CircleGeometry(0.025, 16),
                    new MeshBasicMaterial({color: HANDLE_COLOR}));
                dot.translateX(p.x);
                dot.translateY(p.y);
                dot.translateZ(0.01);
                this.draggables.push(dot);
                this.scene.add(dot);
            }
        }
        this.tableDirty = true;
        this.updateTable();
    }

    affineVertexDragStart() {
        this.dragging = true;
    }

    affineVertexDrag() {
        this.updateTable();
    }

    affineVertexDragEnd() {
        this.dragging = false;
        this.updateTable();
    }

    updateTable() {
        this.tableDirty = false;

        this.scene.remove(this.polygon);
        this.scene.remove(this.polygonBorder);
        this.scene.remove(this.semidisk);
        let vertices: Vector2[] = [];
        switch (this.plane) {
        case Plane.AFFINE:
            if (this.tableParams.semidisk) {
                this.scene.add(this.semidisk);
            } else {
                vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
                this.affineTable = new NewAffinePolygonTable(vertices);
            }
            break;
        case Plane.HYPERBOLIC:
            const hyperPoints = this.hyperbolicPoints();
            this.hyperbolicTable = new NewHyperbolicPolygonTable(hyperPoints);
            vertices = this.hyperbolicTable.interpolateVertices(this.model);
            break;
        default:
            throw Error('Unknown plane type:' + this.billiardTypeParams.plane);
        }

        if (this.duality === Duality.INNER && this.singularities) this.scene.remove(this.singularities);

        if (!this.tableParams.semidisk) {
            let shape = new THREE.Shape(vertices);
            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshBasicMaterial({color: FILL_COLOR});
            this.polygon = new THREE.Mesh(geometry, material);
            this.scene.add(this.polygon);

            const edgeMaterial = new THREE.MeshBasicMaterial({color: FILL_COLOR});
            const edgeGeometry = new BufferGeometry().setFromPoints(vertices.concat([vertices[0]]));
            this.polygonBorder = new THREE.Line(edgeGeometry, edgeMaterial);
            this.scene.add(this.polygonBorder);
        }

        this.singularityDirty = true;
        if (this.duality === Duality.OUTER && this.flavor === Flavor.SYMPLECTIC) this.derivativeDirty = true;
        this.orbitDirty = true;
        this.drawDirty = true;
    }

    updateSingularities() {
        this.scene.remove(this.singularities);
        this.singularities = new THREE.Object3D();
        if (this.duality !== Duality.OUTER || !this.drawParams.singularities) return;
        this.singularityDirty = false;
        let preimages;
        let points: Vector2[];
        const material = new THREE.LineBasicMaterial({
            color: SINGULARITY_COLOR,
        });
        const geometry = new THREE.BufferGeometry();
        const si = this.dragging ? Math.min(this.drawParams.singularityIterations, 1) : this.drawParams.singularityIterations;
        switch (this.plane) {
        case Plane.AFFINE:
            if (this.tableParams.semidisk) {
                preimages = this.semiDiskTable.preimages(this.flavor, si)
            } else {
                preimages = this.affineTable.preimages(this.flavor, si)
            }
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
            preimages = this.hyperbolicTable.preimages(this.flavor, this.drawParams.singularityIterations);
            this.drawHyperbolicPreimages(preimages);
            break;
        default:
            throw Error('Unknown plane');
        }

        this.drawDirty = true;
    }

    updateDerivatives() {
        if (!this.derivativeDirty) return;
        this.derivativeDirty = false;
        try {
            this.scene.remove(this.derivatives);
        } catch (e) {
        }
        const values = new Map<Vector2, Vector3>();
        const delta = 0.000_001;
        const bound = this.drawParams.derivativeBound;
        const step = Math.pow(2,
            this.dragging ? Math.max(this.drawParams.derivativeStep, -1) : this.drawParams.derivativeStep
        );
        const table = this.tableParams.semidisk ? this.semiDiskTable : this.affineTable;
        for (let i = -bound; i <= bound; i += step) {
            for (let j = -bound; j < bound; j += step) {
                const start = new Vector2(i, j);
                const ia = table.iterateOuter(new Vector2(i, j), this.flavor, 1)[0];
                if (ia.length != 2) continue;
                const xa = table.iterateOuter(new Vector2(i + delta, j), this.flavor, 1)[0];
                if (xa.length != 2) continue;
                const ya = table.iterateOuter(new Vector2(i, j + delta), this.flavor, 1)[0];
                if (ya.length != 2) continue;
                const image = ia[1];
                const dx = xa[1].sub(image);
                const dy = ya[1].sub(image);
                const det = dx.cross(dy) / (delta * delta);
                const rotX = dx.angle();
                const rotY = dy.angle() - Math.PI / 2;
                if (Math.abs(det) < 0.000_000_1) continue;
                values.set(start, new Vector3(
                    det,
                    rotX,
                    rotY,
                ));
            }
        }
        const geometry = new BoxGeometry(step, step, step);
        const material = new MeshBasicMaterial({color: new Color(0xffffff)});
        const im = new InstancedMesh(geometry, material, values.size);
        let i = 0;
        for (let [pos, val] of values.entries()) {
            const lv = Math.log(val.x);

            const s = 0.25;
            im.setMatrixAt(i, new Matrix4().makeTranslation(pos.x, pos.y, -step * 2));
            im.setColorAt(i, new Color().setRGB(
                lv < 0 ? Math.pow(clamp(-lv, 0, 1), s) : 0,
                lv > 0 ? Math.pow(clamp(lv, 0, 1), s) / 2 : 0,
                lv > 0 ? Math.pow(clamp(lv, 0, 1), s) : 0,
            ));
            i++;
        }
        im.instanceMatrix.needsUpdate = true;
        this.derivatives = im;
        this.drawDirty = true;
    }

    private drawHyperbolicPreimages(preimages: HyperGeodesic[]): void {
        console.log('drawing', preimages.length, 'preimages');
        this.scene.remove(this.singularities);
        const points = [];
        for (let preimage of preimages) {
            const preimagePoints = preimage.interpolate(this.model, preimage.start, true).map(c => c.toVector2());
            for (let i = 0; i < preimagePoints.length - 1; i++) {
                points.push(preimagePoints[i]);
                points.push(preimagePoints[i + 1]);
            }
        }
        const material = new THREE.LineBasicMaterial({
            color: SINGULARITY_COLOR,
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints(points);
        this.singularities = new THREE.LineSegments(geometry, material);
        if (this.drawParams.singularities) this.scene.add(this.singularities);
    }

    updateOrbit() {
        this.orbitDirty = false;
        this.drawDirty = true;
        this.scene.remove(this.orbit);
        this.scene.remove(this.startPoint);
        this.scene.remove(this.nextPoint);

        for (let s of this.scaffold) {
            this.scene.remove(s);
        }
        this.scaffold = [];
        this.scene.remove(this.centers);
        this.centers = new THREE.Points();

        let startPointPosition: Vector2;
        let nextPointPosition: Vector2;
        let geometry;
        let material;
        const scaffoldmat = new LineBasicMaterial({color: SCAFFOLD_COLOR});
        const it = this.dragging ? Math.min(this.iterations, 2) : this.iterations;
        switch (this.plane) {
        case Plane.AFFINE:
            switch (this.duality) {
            case Duality.INNER:
                const chords = this.affineTable.iterateInner(
                    {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI},
                    this.flavor,
                    it,
                );
                if (chords.length === 0) {
                    this.orbit = new THREE.Object3D();
                    return;
                }
                if (chords.length > 1 && this.flavor === Flavor.SYMPLECTIC && this.drawParams.scaffold) {
                    // Line segment from
                    const p1 = this.affineTable.point(chords[0].startTime);
                    const p2 = this.affineTable.point(chords[0].endTime);
                    const h2 = this.affineTable.heading(chords[0].endTime);
                    const diff = new Vector2(Math.cos(h2), Math.sin(h2)).multiplyScalar(10);
                    const p3 = this.affineTable.point(chords[1].endTime);
                    const sc = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    sc.geometry.setFromPoints([p1, p3]);
                    const tl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    tl.geometry.setFromPoints([p2.clone().add(diff), p2.clone().sub(diff)]);
                    this.scaffold.push(sc, tl);
                }
                const points = chords.map(chord => chord.p1);
                points.push(chords[chords.length - 1].p2);

                startPointPosition = points[0];
                nextPointPosition = points[1];

                geometry = new THREE.BufferGeometry().setFromPoints(points);

                material = new THREE.LineBasicMaterial({color: CHORDS_COLOR});

                this.orbit = new THREE.Line(geometry, material);
                break;
            case Duality.OUTER:
                const table = this.tableParams.semidisk ? this.semiDiskTable : this.affineTable;
                const result = table.iterateOuter(this.affineOuterStart, this.flavor, it);
                const orbit = result[0];
                if (orbit.length > 1 && this.flavor === Flavor.SYMPLECTIC && this.drawParams.scaffold) {
                    const ac = table.symplecticOuterCircle(this.affineOuterStart, false);

                    const path = new THREE.Path();
                    path.absellipse(ac.center.x, ac.center.y, ac.radius, ac.radius, 0, 2 * Math.PI, true, 0);
                    const diskPoints = path.getPoints(32);

                    const diskGeometry = new THREE.BufferGeometry().setFromPoints(diskPoints);
                    this.scaffold.push(new THREE.Line(diskGeometry, scaffoldmat));

                    const rp = table.reversePoint(orbit[0]);
                    const dr = orbit[0].clone().sub(rp).normalize().multiplyScalar(100);
                    const df = orbit[0].clone().sub(orbit[1]).normalize().multiplyScalar(100);
                    const tp = table.forwardPoint(orbit[1]);
                    const dt = orbit[1].clone().sub(tp).normalize().multiplyScalar(100);
                    const rtl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    const ftl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    const ttl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    rtl.geometry.setFromPoints([orbit[0].clone().add(dr), rp.clone().sub(dr)]);
                    ftl.geometry.setFromPoints([orbit[0].clone().add(df), orbit[1].clone().sub(df)]);
                    ttl.geometry.setFromPoints([orbit[1].clone().add(dt), tp.clone().sub(dt)]);

                    this.scaffold.push(rtl, ftl, ttl);
                    for (let i = 0; i < 1000; i++) {
                        console.log(orbit[2 * i % orbit.length].angle(), normalizeAngle(
                            orbit[2 * i % orbit.length].angle() - orbit[2 * (i + 1) % orbit.length].angle())
                        );
                    }
                }
                startPointPosition = this.affineOuterStart;
                nextPointPosition = orbit.length > 1 ? orbit[1] : startPointPosition;

                if (this.drawParams.orbitPaths) {
                    geometry = new THREE.BufferGeometry().setFromPoints(orbit);
                    material = new THREE.LineBasicMaterial({color: OUTER_ORBIT_COLOR});
                    this.orbit = new THREE.Line(geometry, material);
                    if (result.length > 1 && this.flavor === Flavor.SYMPLECTIC && this.drawParams.centers) {
                        const linegeometry = new THREE.BufferGeometry().setFromPoints(result[1]);
                        const linematerial = new THREE.LineBasicMaterial({color: CIRCLE_CENTER_COLOR});
                        this.centers = new THREE.Line(linegeometry, linematerial);
                    }
                } else {
                    this.orbit = new THREE.Points();
                    (this.orbit as THREE.Points).geometry.setFromPoints(orbit);
                    ((this.orbit as THREE.Points).material as THREE.PointsMaterial).color = new Color(OUTER_ORBIT_COLOR);
                    if (result.length > 1 && this.flavor === Flavor.SYMPLECTIC && this.drawParams.centers) {
                        this.centers = new THREE.Points();
                        (this.centers as THREE.Points).geometry.setFromPoints(result[1]);
                        ((this.centers as THREE.Points).material as THREE.PointsMaterial).color = new Color(CIRCLE_CENTER_COLOR);
                    }
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
                    this.nextPoint = new THREE.Mesh();
                    return;
                }
                geometry = new THREE.BufferGeometry().setFromPoints(points);
                material = new THREE.LineBasicMaterial({color: CHORDS_COLOR});
                this.orbit = new THREE.Line(geometry, material);
                startPointPosition = chords[0].start.resolve(this.model).toVector2();
                nextPointPosition = chords[0].end.resolve(this.model).toVector2();
                break;
            case Duality.OUTER:
                const orbit = this.hyperbolicTable.iterateOuter(this.hyperOuterStart, this.flavor, this.iterations);
                startPointPosition = this.hyperOuterStart.resolve(this.model).toVector2();
                if (orbit.length > 1) nextPointPosition = orbit[1].resolve(this.model).toVector2();
                else nextPointPosition = orbit[0].resolve(this.model).toVector2();

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
        this.nextPoint.translateX(nextPointPosition.x - this.nextPoint.position.x);
        this.nextPoint.translateY(nextPointPosition.y - this.nextPoint.position.y);

        this.drawDirty = true;
    }

    updateDraw() {
        this.drawDirty = false;

        if (this.plane === Plane.HYPERBOLIC) this.scene.add(this.hyperbolicDisk);
        else this.scene.remove(this.hyperbolicDisk);

        if (this.duality === Duality.OUTER && this.drawParams.singularities) this.scene.add(this.singularities);
        else this.scene.remove(this.singularities);

        if (this.drawParams.derivative) {
            this.scene.add(this.derivatives);
        }

        if (this.drawParams.scaffold) {
            for (let s of this.scaffold) this.scene.add(s);
        }

        if (this.drawParams.orbit) this.scene.add(this.orbit);
        if (this.drawParams.centers) this.scene.add(this.centers);
        this.scene.add(this.startPoint);
        this.scene.add(this.nextPoint);
    }

    get plane(): Plane {
        return this.billiardTypeParams.plane === 'Affine' ? Plane.AFFINE : Plane.HYPERBOLIC;
    }

    get duality(): Duality {
        return this.billiardTypeParams.duality === 'Inner' ? Duality.INNER : Duality.OUTER;
    }

    get flavor(): Flavor {
        switch (this.duality) {
        case Duality.INNER:
            return this.billiardTypeParams.flavor === 'Length' ? Flavor.REGULAR : Flavor.SYMPLECTIC;
        case Duality.OUTER:
            return this.billiardTypeParams.flavor === 'Area' ? Flavor.REGULAR : Flavor.SYMPLECTIC;
        default:
            throw Error('Unexpected duality:' + this.duality);
        }
    }

    get model(): HyperbolicModel {
        return this.drawParams.model === 'Poincaré' ? HyperbolicModel.POINCARE : HyperbolicModel.KLEIN;
    }

    get iterations(): number {
        return Math.pow(2, this.gameParams.iterations) - 1;
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
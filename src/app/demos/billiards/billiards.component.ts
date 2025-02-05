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
    MeshPhongMaterial,
    Object3D,
    Points,
    PointsMaterial,
    SphereGeometry,
    Vector2,
    Vector4
} from 'three';
import * as dat from 'dat.gui';
import {Duality, Generator, Geometry} from "../../../math/billiards/new-billiard";
import {AffinePolygonTable, AffineRay} from "../../../math/billiards/affine-polygon-table";
import {NewHyperbolicPolygonTable} from "../../../math/billiards/new-hyperbolic-polygon-table"
import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {Complex} from "../../../math/complex";
import {AffineOuterBilliardTable, fixTime, SphericalOuterBilliardTable} from "../../../math/billiards/tables";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DragControls} from "three/examples/jsm/controls/DragControls";
import {AffineSemicircleTable} from "../../../math/billiards/affine-semicircle-table";
import {clamp} from "three/src/math/MathUtils";
import {AffineFlexigonTable} from "../../../math/billiards/affine-flexigon-table";

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

enum TableType {
    POLYGON = 'Polygon',
    FLEXIGON = 'Flexigon',
    SEMIDISK = 'Semidisk',
    SUPERELLIPSE = 'Superellipse',
}

interface PolygonParams {
    n: number,
    r: number,
}

interface FlexigonParams {
    n: number,
    k: number,
}

interface SuperellipseParams {
    p: number,
}

interface TableParams {
    tableType: TableType,
    polygonParams: PolygonParams,
    flexigonParams: FlexigonParams,
    superellipseParams: SuperellipseParams,
}

@Component({
    selector: 'billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class BilliardsComponent extends ThreeDemoComponent {
    orbitControls: OrbitControls;
    dragControls: DragControls;
    draggables: Object3D[] = [];
    dragging = false;

    // Parameters
    billiardTypeParams = {
        duality: Duality.OUTER,
        generator: Generator.LENGTH,
        geometry: Geometry.AFFINE,
    }

    tableParams: TableParams = {
        tableType: TableType.POLYGON,
        polygonParams: {
            n: 3,
            r: 0.5,
        },
        flexigonParams: {
            n: 3,
            k: 0.5,
        },
        superellipseParams: {
            p: 1.5,
        }
    }

    drawParams = {
        model: 'Poincaré',
        singularities: true,
        singularityIterations: 100,
        orbit: true,
        connectEvery: 1,
        derivative: false,
        derivativeBound: 5,
        derivativeStep: -1,
        scaffold: true,
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
    derivativeDirty = false;
    orbitDirty = true;
    drawDirty = true;

    gui: dat.GUI;

    // Stuff on the screen
    hyperbolicDisk: THREE.Line;
    sphericalSphere: THREE.Mesh;
    polygon = new THREE.Mesh();
    orbit: Object3D[] = [];
    centers = new THREE.Object3D();
    singularities = new THREE.Object3D();
    derivatives = new THREE.Object3D();
    startPoint = new THREE.Mesh();
    nextPoint = new THREE.Mesh();
    scaffold: THREE.Object3D[] = [];
    tableMesh = new THREE.Mesh();

    // Billiards
    affineOuterTable!: AffineOuterBilliardTable;
    affineTable!: AffinePolygonTable;
    hyperbolicTable!: NewHyperbolicPolygonTable;
    sphericalTable!: SphericalOuterBilliardTable
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
        this.sphericalSphere = new Mesh(
            new SphereGeometry(1, 50, 50),
            new MeshPhongMaterial({
                transparent: true,
                opacity: 0.8,
                color: 0xffaaff,
            })
        );

        const semiDiskPoints = [];
        for (let i = 0; i <= 90; i++) {
            semiDiskPoints.push(new Vector2(
                Math.cos(i / 90 * Math.PI),
                Math.sin(i / 90 * Math.PI),
            ));
        }

        const startPointGeometry = new THREE.CircleGeometry(0.025, 32);
        const nextPointGeometry = new THREE.CircleGeometry(0.025, 16);
        const startPointMaterial = new THREE.MeshBasicMaterial({color: START_POINT_COLOR});
        const endPointMaterial = new THREE.MeshBasicMaterial({color: END_POINT_COLOR});

        this.startPoint = new THREE.Mesh(startPointGeometry, startPointMaterial);
        this.nextPoint = new THREE.Mesh(nextPointGeometry, endPointMaterial);

        this.resetAffineVertices();

        this.gui = new dat.GUI();
        this.updateGUI();

        const al = new THREE.AmbientLight(0xffffff, 0.25);
        const dl = new THREE.DirectionalLight(0xffffff, 0.5);
        dl.position.set(1, 1, 1);
        dl.target = this.sphericalSphere;

        this.scene.add(al, dl);
    }

    private processKeyboardInput(dt: number): void {
        if (this.geometry === Geometry.AFFINE &&
            this.duality === Duality.OUTER &&
            this.keyJustPressed('KeyK')) {
            this.setKite();
        }
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
            if (this.geometry === Geometry.AFFINE) {
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
        if (this.geometry === Geometry.HYPERBOLIC && this.duality === Duality.OUTER && this.hyperbolicTable.fresh) {
            this.drawHyperbolicPreimages(this.hyperbolicTable.singularities);
            this.hyperbolicTable.fresh = false;
        }
        if (this.derivativeDirty) this.updateDerivatives();
        if (this.orbitDirty) this.updateOrbit();
        if (this.drawDirty) this.updateDraw();

        //     if (this.generator === Generator.AREA &&
        //         this.duality === Duality.OUTER &&
        //         this.drawParams.singularities &&
        //         this.singularityDirty
        //     ) {
        //         const vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
        //         while (vertices.length < 12) vertices.push(new Vector2());
        //         const width = this.orthographicCamera.right - this.orthographicCamera.left;
        //         const height = this.orthographicCamera.top - this.orthographicCamera.bottom;
        //         this.bigQuad.scale.set(width, height, 1);
        //         (this.bigQuad.material as ShaderMaterial).uniforms['uTranslation'].value =
        //             new Vector2(this.orthographicCamera.position.x, this.orthographicCamera.position.y);
        //         (this.bigQuad.material as ShaderMaterial).uniforms['uScale'].value = new Vector2(width, height);
        //         (this.bigQuad.material as ShaderMaterial).uniforms['uZoom'].value = 1 / this.orthographicCamera.zoom;
        //         (this.bigQuad.material as ShaderMaterial).uniforms['uIterations'].value =
        //             this.drawParams.singularityIterations;
        //         (this.bigQuad.material as ShaderMaterial).uniforms['uN'].value = this.draggables.length;
        //         (this.bigQuad.material as ShaderMaterial).uniforms['uVertices'].value = vertices;
        //     }
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        const billiardFolder = this.gui.addFolder('Billiard Type');
        billiardFolder.add(this.billiardTypeParams, 'duality').options(Object.values(Duality))
            .name('Duality')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.add(this.billiardTypeParams, 'generator').options(Object.values(Generator))
            .name('Generator')
            .onFinishChange(this.updateBilliardTypeParams.bind(this));
        billiardFolder.add(this.billiardTypeParams, 'geometry').options(Object.values(Geometry))
            .name('Geometry')
            .onFinishChange(() => {
                if (this.geometry === Geometry.HYPERBOLIC) {
                    switch (this.duality) {
                    case Duality.INNER:
                        this.billiardTypeParams.generator = Generator.LENGTH;
                        break;
                    case Duality.OUTER:
                        this.billiardTypeParams.generator = Generator.AREA;
                        break;
                    }
                    this.tableParams.tableType = TableType.POLYGON;
                }
                this.updateBilliardTypeParams();
            });
        billiardFolder.open();

        const tableFolder = this.gui.addFolder('Table');
        tableFolder.add(this.tableParams, 'tableType').options(Object.values(TableType)).name('Table Type')
            .onFinishChange(() => {
                if (this.tableParams.tableType !== TableType.POLYGON) {
                    this.billiardTypeParams.duality = Duality.OUTER;
                    this.billiardTypeParams.geometry = Geometry.AFFINE;
                }
                this.updateTableParams();
            });
        switch (this.tableParams.tableType) {
        case TableType.POLYGON:
            tableFolder.add(this.tableParams.polygonParams, 'n').name('n')
                .min(2).max(12).step(1)
                .onFinishChange(this.updateTableParams.bind(this));
            if (this.geometry === Geometry.HYPERBOLIC) {
                tableFolder.add(this.tableParams.polygonParams, 'r').name('r')
                    .min(0.01).max(2).step(0.01)
                    .onFinishChange(this.updateTableParams.bind(this));
            }
            break;
        case TableType.FLEXIGON:
            tableFolder.add(this.tableParams.flexigonParams, 'n').name('n')
                .min(2).max(12).step(1)
                .onFinishChange(this.updateTableParams.bind(this));
            tableFolder.add(this.tableParams.flexigonParams, 'k').name('k')
                .min(0.01).max(0.99).step(0.01)
                .onFinishChange(this.updateTableParams.bind(this));
            break;
        case TableType.SEMIDISK:
            break;
        case TableType.SUPERELLIPSE:
            tableFolder.add(this.tableParams.superellipseParams, 'p').name('p')
                .min(1).max(5).step(0.1)
                .onFinishChange(this.updateTableParams.bind(this));
            break;
        }
        tableFolder.open();

        const drawFolder = this.gui.addFolder('Drawing');
        if (this.geometry === Geometry.HYPERBOLIC) {
            drawFolder.add(this.drawParams, 'model', ['Poincaré', 'Klein'])
                .name('Model').onFinishChange(this.updateDrawParams.bind(this));
        }
        if (this.duality === Duality.OUTER) {
            drawFolder.add(this.drawParams, 'singularities').name('Singularities').onFinishChange(
                this.markDrawDirty.bind(this));
            drawFolder.add(this.drawParams, 'singularityIterations').name('Iterations')
                .min(0).max(1000).step(1)
                .onFinishChange(this.markSingularityDirty.bind(this));
            drawFolder.add(this.drawParams, 'connectEvery').name('Connect every')
                .min(0).max(12).step(1)
                .onFinishChange(this.markOrbitDirty.bind(this));
        }
        if (this.geometry === Geometry.AFFINE && this.duality === Duality.OUTER && this.generator === Generator.LENGTH) {
            drawFolder.add(this.drawParams, 'scaffold').name('Scaffold').onFinishChange(
                this.markOrbitDirty.bind(this));
            drawFolder.add(this.drawParams, 'centers').name('Centers').onFinishChange(
                this.markOrbitDirty.bind(this));
            drawFolder.add(this.drawParams, 'derivative').name('Derivative')
                .onFinishChange(this.updateDerivativeParams.bind(this));
            drawFolder.add(this.drawParams, 'derivativeBound').name('Der. bound')
                .min(1).max(50).step(1)
                .onFinishChange(this.markDerivativeDirty.bind(this));
            drawFolder.add(this.drawParams, 'derivativeStep').name('Der. step (log)')
                .min(-8).max(0).step(1)
                .onFinishChange(this.markDerivativeDirty.bind(this));
        }
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
        if (this.duality === Duality.OUTER && this.generator === Generator.LENGTH && this.geometry === Geometry.HYPERBOLIC) {
            gameFolder.add(this.gameParams, 'tilingPolygon')
                .min(3).max(20).step(1).name('Tiling').onFinishChange(this.makeTiling.bind(this));
        }
        gameFolder.open();

        this.gui.open();
    }

    makeTiling() {
        if (!(this.duality === Duality.OUTER && this.generator === Generator.LENGTH && this.geometry === Geometry.HYPERBOLIC)
            || this.gameParams.tilingPolygon < 3) {
            return;
        }
        const n = this.tableParams.polygonParams.n;
        const k = this.gameParams.tilingPolygon;
        const nint = (n - 2) * Math.PI / n;
        const kint = (k - 2) * Math.PI / k;
        if (2 * nint + 2 * kint <= 2 * Math.PI) return;

        const kext = 2 * n * Math.PI / k;

        const t = Math.tan(Math.PI / n) * Math.tan(kext / (2 * n));
        const po = Math.sqrt((1 - t) / (1 + t));
        const ko = HyperPoint.poincareToKlein(po);
        const kl = ko * Math.cos(Math.PI / n);

        console.log('updating radius!')
        this.tableParams.polygonParams.r = HyperPoint.kleinToTrue(kl); // something
        this.updateBilliardTypeParams();
    }

    setKite() {
        this.tableParams.polygonParams.n = 4;
        this.resetAffineVertices();
        const phiInv = (Math.sqrt(5) - 1) / 2;
        const pi10 = Math.PI / 10;
        this.draggables[0].position.set(0, 1, 0);
        this.draggables[1].position.set(Math.cos(11 * pi10), Math.sin(11 * pi10), 0);
        this.draggables[2].position.set(0, -phiInv, 0);
        this.draggables[3].position.set(Math.cos(19 * pi10), Math.sin(19 * pi10), 0);
        this.updateTable();
        console.log(
            this.draggables[0].position,
            this.draggables[1].position,
            this.draggables[2].position,
            this.draggables[3].position);
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
        switch (this.geometry) {
        case Geometry.SPHERICAL:
            this.scene.remove(this.hyperbolicDisk);
            this.scene.add(this.sphericalSphere);
            this.updateTable();
            break;
        case Geometry.AFFINE:
            this.scene.remove(this.hyperbolicDisk);
            this.scene.remove(this.sphericalSphere);
            this.updateTable();
            break;
        case Geometry.HYPERBOLIC:
            this.updateTable();
            this.scene.add(this.hyperbolicDisk);
            this.scene.remove(this.sphericalSphere);
            break;
        default:
            throw Error('Unknown geometry type:' + this.billiardTypeParams.geometry);
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
        if (this.geometry !== Geometry.HYPERBOLIC && this.tableParams.tableType === TableType.POLYGON) {
            const n = this.tableParams.polygonParams.n;
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

        this.scene.remove(this.tableMesh);
        let vertices: Vector2[] = [];
        switch (this.geometry) {
        case Geometry.SPHERICAL:
        case Geometry.AFFINE:
            let shape;
            switch (this.tableParams.tableType) {
            case TableType.POLYGON:
                vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
                this.affineTable = new AffinePolygonTable(vertices);
                this.affineOuterTable = new AffinePolygonTable(vertices);
                shape = this.affineOuterTable.shape(vertices.length);
                break;
            case TableType.FLEXIGON:
                this.affineOuterTable = new AffineFlexigonTable(
                    this.tableParams.flexigonParams.n,
                    this.tableParams.flexigonParams.k
                );
                shape = this.affineOuterTable.shape(this.tableParams.flexigonParams.n * 128);
                break;
            case TableType.SEMIDISK:
                this.affineOuterTable = new AffineSemicircleTable();
                shape = this.affineOuterTable.shape(90);
                break;
            case TableType.SUPERELLIPSE:
                break;
            }
            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshBasicMaterial({color: FILL_COLOR});
            this.tableMesh = new THREE.Mesh(geometry, material);
            this.scene.add(this.tableMesh);
            break;
        case Geometry.HYPERBOLIC:
            const hyperPoints = this.hyperbolicPoints();
            this.hyperbolicTable = new NewHyperbolicPolygonTable(hyperPoints);
            vertices = this.hyperbolicTable.interpolateVertices(this.model);
            break;
        default:
            throw Error('Unknown geometry type:' + this.billiardTypeParams.geometry);
        }

        if (this.duality === Duality.INNER && this.singularities) this.scene.remove(this.singularities);

        this.singularityDirty = true;
        if (this.duality === Duality.OUTER && this.generator === Generator.AREA) this.derivativeDirty = true;
        this.orbitDirty = true;
        this.drawDirty = true;
    }

    updateSingularities() {
        this.scene.remove(this.singularities);
        this.singularities = new THREE.Object3D();
        // if (this.duality !== Duality.OUTER || this.generator === Generator.AREA || !this.drawParams.singularities) return;
        this.singularityDirty = false;
        let preimages: AffineRay[];
        let points: Vector2[];
        const material = new THREE.LineBasicMaterial({
            color: SINGULARITY_COLOR,
        });
        const geometry = new THREE.BufferGeometry();
        const si = this.dragging ? Math.min(this.drawParams.singularityIterations, 1) : this.drawParams.singularityIterations;
        switch (this.geometry) {
        case Geometry.SPHERICAL:
        case Geometry.AFFINE:
            switch (this.tableParams.tableType) {
            case TableType.POLYGON:
            case TableType.FLEXIGON:
                preimages = this.affineOuterTable.preimages(this.generator, si)
                break;
            case TableType.SEMIDISK:
                // preimages = this.affineOuterTable.preimages(this.generator, Math.max(si, 10))
            case TableType.SUPERELLIPSE:
                preimages = [];
                break;
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
        case Geometry.HYPERBOLIC:
            this.drawHyperbolicPreimages(
                this.hyperbolicTable.preimages(this.generator, this.drawParams.singularityIterations)
            );
            break;
        default:
            throw Error('Unknown geometry');
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
        const values = new Map<Vector2, Vector4>();
        const delta = 0.000_001;
        const bound = this.drawParams.derivativeBound;
        const step = Math.pow(2,
            this.dragging ? Math.max(this.drawParams.derivativeStep, -1) : this.drawParams.derivativeStep
        );
        let table;
        switch (this.tableParams.tableType) {
        case TableType.POLYGON:
        case TableType.FLEXIGON:
        case TableType.SEMIDISK:
            table = this.affineOuterTable;
            break;
        case TableType.SUPERELLIPSE:
            throw Error();
        }
        for (let i = -bound; i <= bound; i += step) {
            for (let j = -bound; j < bound; j += step) {
                const start = new Vector2(i, j);
                const ia = table.iterateOuter(new Vector2(i, j), this.generator, 1)[0];
                if (ia.length != 2) continue;
                const xa = table.iterateOuter(new Vector2(i + delta, j), this.generator, 1)[0];
                if (xa.length != 2) continue;
                const ya = table.iterateOuter(new Vector2(i, j + delta), this.generator, 1)[0];
                if (ya.length != 2) continue;
                const image = ia[1];
                const dx = xa[1].sub(image);
                const dy = ya[1].sub(image);
                const det = dx.cross(dy) / (delta * delta);
                const rotX = dx.angle();
                const rotY = dy.angle() - Math.PI / 2;
                const tangentPoint = table.rightTangentPoint(start);
                let d = image.distanceTo(tangentPoint) - start.distanceTo(tangentPoint);
                if (Math.abs(det) < 0.000_000_1) continue;
                values.set(start, new Vector4(
                    det,
                    rotX,
                    rotY,
                    d
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
                lv > 0 ? Math.pow(clamp(lv, 0, 1), s) : 0,
                val.w,
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
        this.scene.remove(...this.orbit);
        this.scene.remove(this.startPoint);
        this.scene.remove(this.nextPoint);
        this.scene.remove(...this.scaffold);

        this.scaffold = [];
        this.scene.remove(this.centers);
        this.centers = new THREE.Points();

        let startPointPosition: Vector2;
        let nextPointPosition: Vector2;
        let geometry;
        let material;
        const scaffoldmat = new LineBasicMaterial({color: SCAFFOLD_COLOR});
        const it = this.dragging ? Math.min(this.iterations, 2) : this.iterations;
        switch (this.geometry) {
        case Geometry.SPHERICAL:
        case Geometry.AFFINE:
            switch (this.duality) {
            case Duality.INNER:
                const chords = this.affineTable.iterateInner(
                    {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI},
                    this.generator,
                    it,
                );
                if (chords.length === 0) {
                    this.orbit = [];
                    return;
                }
                if (chords.length > 1 && this.generator === Generator.AREA && this.drawParams.scaffold) {
                    // Line segment from
                    const p1 = this.affineTable.point(chords[0].startTime);
                    const p2 = this.affineTable.point(chords[0].endTime);
                    const h2 = this.affineTable.tangentHeading(chords[0].endTime);
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

                this.orbit = [new THREE.Line(geometry, material)];
                break;
            case Duality.OUTER:
                let table;
                switch (this.tableParams.tableType) {
                case TableType.POLYGON:
                case TableType.FLEXIGON:
                case TableType.SEMIDISK:
                    table = this.affineOuterTable;
                    break;
                case TableType.SUPERELLIPSE:
                    throw Error();
                }
                const result = table.iterateOuter(this.affineOuterStart, this.generator, it);
                const orbit = result[0];
                if (this.generator === Generator.LENGTH && this.drawParams.scaffold && orbit.length > 1) {
                    const ac = table.outerLengthCircle(this.affineOuterStart, false);

                    const path = new THREE.Path();
                    path.absellipse(ac.center.x, ac.center.y, ac.radius, ac.radius, 0, 2 * Math.PI, true, 0);
                    const diskPoints = path.getPoints(Math.max(32, ac.radius * 4));

                    const diskGeometry = new THREE.BufferGeometry().setFromPoints(diskPoints.concat([diskPoints[0]]));
                    this.scaffold.push(new THREE.Line(diskGeometry, scaffoldmat));

                    const rp = table.leftTangentPoint(orbit[0]);
                    const fp = table.rightTangentPoint(orbit[0]);
                    // const tp = table.rightTangentPoint(ac);
                    const dr = orbit[0].clone().sub(rp).normalize().multiplyScalar(100);
                    const df = orbit[0].clone().sub(fp).normalize().multiplyScalar(100);
                    const rtl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    const ftl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                    rtl.geometry.setFromPoints([orbit[0].clone().add(dr), rp.clone().sub(dr)]);
                    ftl.geometry.setFromPoints([orbit[0].clone().add(df), fp.clone().sub(df)]);
                    this.scaffold.push(rtl, ftl);
                    // if (table instanceof AffineFlexigonTable) {
                    //     const tl = table.rightTangentLine(ac);
                    // }
                    if (orbit.length > 1) {
                        const tp = table.rightTangentPoint(orbit[1]);
                        const ttl = new THREE.Line(new BufferGeometry(), scaffoldmat);
                        const df = orbit[0].clone().sub(orbit[1]).normalize().multiplyScalar(100);
                        const dt = orbit[1].clone().sub(tp).normalize().multiplyScalar(100);
                        ttl.geometry.setFromPoints([orbit[1].clone().add(dt), tp.clone().sub(dt)]);
                        this.scaffold.push(ttl);
                    }
                }
                startPointPosition = this.affineOuterStart;
                nextPointPosition = orbit.length > 1 ? orbit[1] : startPointPosition;

                if (this.drawParams.connectEvery == 0) {
                    const pts = new Points(new BufferGeometry().setFromPoints(orbit), new PointsMaterial({color: OUTER_ORBIT_COLOR}));
                    this.orbit = [pts];
                    if (result.length > 1 && this.generator === Generator.LENGTH && this.drawParams.centers) {
                        this.centers = new THREE.Points();
                        (this.centers as THREE.Points).geometry.setFromPoints(result[1]);
                        ((this.centers as THREE.Points).material as THREE.PointsMaterial).color = new Color(CIRCLE_CENTER_COLOR);
                    }
                    break;
                }
                // connectEvery > 0
                const seqs: Vector2[][] = [];
                for (let i = 0; i < this.drawParams.connectEvery; i++) seqs.push([]);
                for (let i = 0; i < orbit.length; i++) {
                    seqs[i % this.drawParams.connectEvery].push(orbit[i]);
                }
                this.orbit = [];
                for (let s of seqs) {
                    geometry = new THREE.BufferGeometry().setFromPoints(s);
                    material = new THREE.LineBasicMaterial({color: OUTER_ORBIT_COLOR});
                    this.orbit.push(new THREE.Line(geometry, material));
                    if (result.length > 1 && this.generator === Generator.LENGTH && this.drawParams.centers) {
                        const lineGeometry = new THREE.BufferGeometry().setFromPoints(result[1]);
                        const lineMaterial = new THREE.LineBasicMaterial({color: CIRCLE_CENTER_COLOR});
                        this.centers = new THREE.Line(lineGeometry, lineMaterial);
                    }
                }
                break;
            default:
                throw Error('Unknown duality');
            }
            break;
        case Geometry.HYPERBOLIC:
            let points: Vector2[];
            switch (this.duality) {
            case Duality.INNER:
                const chords = this.hyperbolicTable.iterateInner(
                    {time: this.gameParams.startTime, angle: this.gameParams.angle * Math.PI},
                    this.generator,
                    this.iterations);
                points = [];
                for (let chord of chords) {
                    points.push(...chord.interpolate(this.model, chord.start).map(c => c.toVector2()));
                }
                if (chords.length === 0) {
                    this.orbit = [];
                    this.nextPoint = new THREE.Mesh();
                    return;
                }
                geometry = new THREE.BufferGeometry().setFromPoints(points);
                material = new THREE.LineBasicMaterial({color: CHORDS_COLOR});
                this.orbit = [new THREE.Line(geometry, material)];
                startPointPosition = chords[0].start.resolve(this.model).toVector2();
                nextPointPosition = chords[0].end.resolve(this.model).toVector2();
                break;
            case Duality.OUTER:
                const orbit = this.hyperbolicTable.iterateOuter(this.hyperOuterStart, this.generator, this.iterations);
                startPointPosition = this.hyperOuterStart.resolve(this.model).toVector2();
                if (orbit.length > 1) nextPointPosition = orbit[1].resolve(this.model).toVector2();
                else nextPointPosition = orbit[0].resolve(this.model).toVector2();

                if (this.drawParams.connectEvery == 0) {
                    geometry = new THREE.CircleGeometry(0.005, 16);
                    material = new THREE.MeshBasicMaterial({color: OUTER_ORBIT_COLOR});
                    this.orbit = [new THREE.InstancedMesh(geometry, material, orbit.length)];
                    for (let i = 0; i < orbit.length; i++) {
                        (this.orbit[0] as THREE.InstancedMesh)
                            .setMatrixAt(i, new Matrix4().makeTranslation(
                                orbit[i].resolve(this.model).x,
                                orbit[i].resolve(this.model).y,
                                0));
                    }
                    (this.orbit[0] as THREE.InstancedMesh).instanceMatrix.needsUpdate = true;
                    break;
                }
                // connectEvery > 0
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
                this.orbit = [new THREE.Line(geometry, material)];
                break;
            default:
                throw Error('Unknown duality');
            }
            break;
        default:
            throw Error('Unknown geometry');
        }
        this.startPoint.translateX(startPointPosition.x - this.startPoint.position.x);
        this.startPoint.translateY(startPointPosition.y - this.startPoint.position.y);
        this.nextPoint.translateX(nextPointPosition.x - this.nextPoint.position.x);
        this.nextPoint.translateY(nextPointPosition.y - this.nextPoint.position.y);

        this.drawDirty = true;
    }

    updateDraw() {
        this.drawDirty = false;

        if (this.geometry === Geometry.HYPERBOLIC) this.scene.add(this.hyperbolicDisk);
        if (this.geometry === Geometry.SPHERICAL) this.scene.add(this.sphericalSphere);
        else this.scene.remove(this.hyperbolicDisk);

        if (this.duality === Duality.OUTER && this.drawParams.singularities) this.scene.add(this.singularities);
        else this.scene.remove(this.singularities);

        if (this.drawParams.derivative) this.scene.add(this.derivatives);

        if (this.drawParams.scaffold && this.scaffold.length > 0) this.scene.add(...this.scaffold);

        if (this.drawParams.orbit) this.scene.add(...this.orbit);
        if (this.drawParams.centers) this.scene.add(this.centers);
        this.scene.add(this.startPoint);
        this.scene.add(this.nextPoint);
    }

    get geometry(): Geometry {
        return this.billiardTypeParams.geometry;
    }

    get duality(): Duality {
        return this.billiardTypeParams.duality;
    }

    get generator(): Generator {
        return this.billiardTypeParams.generator;
    }

    get model(): HyperbolicModel {
        return this.drawParams.model === 'Poincaré' ? HyperbolicModel.POINCARE : HyperbolicModel.KLEIN;
    }

    get iterations(): number {
        return Math.pow(2, this.gameParams.iterations) - 1;
    }

    private hyperbolicPoints(): HyperPoint[] {
        const points = [];
        const n = this.tableParams.polygonParams.n;
        const r = this.tableParams.polygonParams.r;
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
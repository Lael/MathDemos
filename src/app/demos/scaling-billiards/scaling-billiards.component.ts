import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import * as THREE from 'three';
import {BufferGeometry, Line, LineBasicMaterial, Object3D, Points, PointsMaterial, Vector2} from 'three';
import * as dat from 'dat.gui';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DragControls} from "three/examples/jsm/controls/DragControls";
import {lpCircle} from "../../../math/billiards/oval-table";

// Colors
const CLEAR_COLOR = 0x0a2933;
const FILL_COLOR = 0xf9f4e9;
const BORDER_COLOR = 0x990044;
const CHORDS_COLOR = 0x000000;
const OUTER_ORBIT_COLOR = 0x3adecb;
const SINGULARITY_COLOR = 0xff7f5e;
const START_POINT_COLOR = 0x51e76f;
const END_POINT_COLOR = 0x6f51e7;
const SCAFFOLD_COLOR = 0xffbbff;
const HANDLE_COLOR = 0x990044;
const CIRCLE_CENTER_COLOR = 0xf5dd90;

@Component({
    selector: 'billiards',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class ScalingBilliardsComponent extends ThreeDemoComponent {
    orbitControls: OrbitControls;
    dragControls: DragControls;
    draggables: Object3D[] = [];
    dragging = false;

    // Parameters

    tableParams = {
        p: 2,
    };

    drawParams = {
        orbit: true,
        orbitPaths: true,
        scaffold: false,
    }

    gameParams = {
        scaleFactor: 1,
        iterations: 1,
    }

    // When to update stuff
    tableDirty = true;
    orbitDirty = true;
    drawDirty = true;

    gui: dat.GUI;

    // Stuff on the screen
    polygon = new THREE.Mesh();
    orbit = new THREE.Object3D();
    startPointDisk = new THREE.Mesh();
    nextPoint = new THREE.Mesh();
    scaffold: THREE.Object3D[] = [];
    currentOrbit: Vector2[] = [];
    savedOrbits: Vector2[] = [];
    savedOrbitsObj = new Points();

    // Billiards
    table = lpCircle(this.tableParams.p);
    start: Vector2 = new Vector2(-4, 1);

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;
        this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('dragstart', this.startPointDragStart.bind(this));
        this.dragControls.addEventListener('drag', this.startPointDrag.bind(this));
        this.dragControls.addEventListener('dragend', this.startPointDragEnd.bind(this));

        this.renderer.setClearColor(CLEAR_COLOR);

        const startPointGeometry = new THREE.CircleGeometry(0.025, 32);
        const nextPointGeometry = new THREE.CircleGeometry(0.025, 32);
        const startPointMaterial = new THREE.MeshBasicMaterial({color: START_POINT_COLOR});
        const endPointMaterial = new THREE.MeshBasicMaterial({color: END_POINT_COLOR});

        this.startPointDisk = new THREE.Mesh(startPointGeometry, startPointMaterial);
        this.nextPoint = new THREE.Mesh(nextPointGeometry, endPointMaterial);
        this.draggables.push(this.startPointDisk);
        this.startPointDisk.position.set(this.start.x, this.start.y, 0);

        this.gui = new dat.GUI();
        this.updateGUI();
    }

    private processKeyboardInput(dt: number): void {
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
        const startPointDiff = pointDiff.multiplyScalar(0.5 * dt / this.orthographicCamera.zoom);
        this.start.add(startPointDiff);
        this.orbitDirty = true;
    }

    override keydown(e: KeyboardEvent) {
        super.keydown(e);
        if (e.code === 'KeyC') {
            this.savedOrbits.push(...this.currentOrbit);
            this.savedOrbitsObj.geometry.setFromPoints(this.savedOrbits);
        }
        if (e.code === 'KeyS') {

        }
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);

        if (this.tableDirty) this.updateTable();
        if (this.orbitDirty) this.updateOrbit();
        if (this.drawDirty) this.updateDraw();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();


        const drawFolder = this.gui.addFolder('Drawing');
        drawFolder.add(this.drawParams, 'orbitPaths').name('Orbit Paths').onFinishChange(
            this.markOrbitDirty.bind(this));
        drawFolder.open();

        const gameFolder = this.gui.addFolder('Game');
        gameFolder.add(this.tableParams, 'p')
            .min(1).max(100).name('Superellipse')
            .onFinishChange(this.markTableDirty.bind(this));
        gameFolder.add(this.gameParams, 'scaleFactor')
            .min(0.9).max(1).step(0.0001).name('Decay')
            .onChange(() => {
                this.orbitDirty = true;
            });
        gameFolder.add(this.gameParams, 'iterations')
            .min(1).max(20).step(1).name('Iterations (log)')
            .onChange(() => {
                this.orbitDirty = true;
            });
        gameFolder.open();

        this.gui.open();
    }

    markTableDirty() {
        this.tableDirty = true;
    }

    markOrbitDirty() {
        this.orbitDirty = true;
    }

    markDrawDirty() {
        this.drawDirty = true;
    }

    startPointDragStart() {
        this.dragging = true;
    }

    startPointDrag() {
        this.start.x = this.startPointDisk.position.x;
        this.start.y = this.startPointDisk.position.y;
        this.orbitDirty = true;
    }

    startPointDragEnd() {
        this.dragging = false;
        this.orbitDirty = true;
    }

    updateTable() {
        this.tableDirty = false;

        this.scene.remove(this.polygon);

        this.table = lpCircle(this.tableParams.p);

        let vertices: Vector2[] = this.table.points(256);

        let shape = new THREE.Shape(vertices);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({color: FILL_COLOR});
        this.polygon = new THREE.Mesh(geometry, material);

        this.orbitDirty = true;
        this.drawDirty = true;
    }

    updateOrbit() {
        this.orbitDirty = false;
        this.drawDirty = true;
        this.scene.remove(this.orbit);
        this.startPointDisk.position.set(this.start.x, this.start.y, 0);

        for (let s of this.scaffold) {
            this.scene.remove(s);
        }
        this.scaffold = [];

        let startPointPosition: Vector2;
        let nextPointPosition: Vector2;
        let geometry;
        let material;

        const iterations = this.dragging ? Math.min(this.iterations, 2) : this.iterations;

        const orbitPoints = [];

        let current = this.start.clone();
        for (let i = 0; i < iterations; i++) {
            orbitPoints.push(current);
            try {
                const tp = this.table.rightTangentPoint(current);
                current = tp.add(tp.clone().sub(current).multiplyScalar(this.gameParams.scaleFactor));
            } catch (e) {
                console.log(e);
                break;
            }
        }

        if (orbitPoints.length >= 2) {
            this.nextPoint.position.set(orbitPoints[1].x, orbitPoints[1].y, 0);
        } else {
            this.nextPoint.position.set(0, 0, 0);
        }

        if (this.drawParams.orbitPaths) {
            this.orbit = new Line(new BufferGeometry().setFromPoints(orbitPoints), new LineBasicMaterial({color: OUTER_ORBIT_COLOR}));
        } else {
            this.orbit = new Points(new BufferGeometry().setFromPoints(orbitPoints), new PointsMaterial({color: OUTER_ORBIT_COLOR}));
        }
    }

    updateDraw() {
        this.drawDirty = false;
        this.scene.clear();

        this.scene.add(this.polygon);

        if (this.drawParams.scaffold) {
            for (let s of this.scaffold) this.scene.add(s);
        }

        if (this.drawParams.orbit) {
            this.scene.add(this.orbit);
            this.scene.add(this.startPointDisk);
            this.scene.add(this.nextPoint);
        }
    }

    get iterations(): number {
        return Math.pow(2, this.gameParams.iterations) - 1;
    }
}
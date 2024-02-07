import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import * as THREE from 'three';
import {
    BufferGeometry,
    CircleGeometry,
    Color,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Points,
    PointsMaterial,
    Vector2,
    Vector3
} from 'three';
import * as dat from 'dat.gui';
import {Complex} from "../../../math/complex";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DragControls} from "three/examples/jsm/controls/DragControls";
import {normalizeAngle} from "../../../math/math-helpers";
import {AffineCircle} from "../../../math/geometry/affine-circle";
import {Line as GeoLine} from "../../../math/geometry/line";
import {LineSegment} from "../../../math/geometry/line-segment";

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

@Component({
    selector: 'ticktock',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
})
export class TicktockComponent extends ThreeDemoComponent {

    orbitControls: OrbitControls;
    dragControls: DragControls;
    draggables: Object3D[] = [];
    dragging = false;

    // Parameters
    params = {
        n: 3,
        vectorField: false,
        timeStep: -4,
        e: 0.4332761727,
        iterations: 10,
        polygonSides: true,
        polygonFill: true,
        vertexOrbits: true,
        vertexPaths: true,
        inscribed: false,
        centers: false,
    }

    gui: dat.GUI;

    // Stuff on the screen
    polygon: Mesh = new Mesh();
    private polygonDirty = true;
    private orbitDirty = true;
    private drawDirty = true;
    private vertexOrbits: Points[] = [];
    private vertexPaths: Line[] = [];
    private images: Line[] = [];
    private centers: Points = new Points();

    private recentlyDragging = false;
    private selectedVertex = 0;
    private debounce = false;

    constructor() {
        super();
        this.useOrthographic = true;
        this.updateOrthographicCamera();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;
        this.orbitControls.enablePan = true;

        this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);
        this.dragControls.addEventListener('dragstart', this.vertexDragStart.bind(this));
        this.dragControls.addEventListener('drag', this.vertexDrag.bind(this));
        this.dragControls.addEventListener('dragend', this.vertexDragEnd.bind(this));

        this.resetVertices();

        this.renderer.setClearColor(CLEAR_COLOR);

        this.gui = new dat.GUI();
        this.updateGUI();
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);
        if (this.polygonDirty) this.updateTable();
        if (this.orbitDirty) this.updateOrbit();
        if (this.drawDirty) this.updateDraw();
    }

    override keydown(e: KeyboardEvent) {
        super.keydown(e);
        if (e.code === 'KeyG') {
            this.goToPhase();
        }
    }

    goToPhase() {
        window.open('/#/triangle-map', '_blank');
    }

    processKeyboardInput(dt: number) {
        if (this.keysPressed.get('Space') != true) this.debounce = false;
        if (!this.debounce && this.keysPressed.get('Space') == true) {
            this.debounce = true;
            this.selectedVertex = (this.selectedVertex + 1) % this.params.n;
            this.markDrawDirty();
        }
        if (this.recentlyDragging) this.markOrbitDirty();
        let speed = 0.1;
        let x = 0;
        let y = 0;
        if (this.keysPressed.get('ArrowLeft')) x -= 1;
        if (this.keysPressed.get('ArrowRight')) x += 1;
        if (this.keysPressed.get('ArrowDown')) y -= 1;
        if (this.keysPressed.get('ArrowUp')) y += 1;
        if (this.keysPressed.get('ShiftLeft')) speed *= 0.1;
        if (this.keysPressed.get('AltLeft')) speed *= 0.01;
        if (x != 0 || y != 0) {
            let d = new Vector3(x, y, 0).normalize().multiplyScalar(speed * dt);
            this.draggables[this.selectedVertex].position.add(d);
            this.recentlyDragging = true;
            this.updateTable();
        } else {
            this.recentlyDragging = false;
        }
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new dat.GUI();

        this.gui.add(this.params, 'n')
            .min(3).max(12).step(1).onChange(this.resetVertices.bind(this));
        this.gui.add(this.params, 'vectorField').name('Vector Field')
            .onFinishChange(() => {
                if (this.params.vectorField) this.params.iterations = Math.min(this.params.iterations + 5, 20);
                else this.params.iterations = Math.min(Math.max(this.params.iterations - 5, 0), 12);
                this.markOrbitDirty();
                this.updateGUI();
            });
        if (!this.params.vectorField) this.gui.add(this.params, 'e').name('t')
            .min(0.0001).max(1).onFinishChange(this.markOrbitDirty.bind(this));
        if (this.params.vectorField) this.gui.add(this.params, 'timeStep').name('log10(dt)')
            .min(-6).max(-1).step(0.5).onFinishChange(this.markOrbitDirty.bind(this));
        this.gui.add(this.params, 'iterations').name('log2(iters)').min(0).max(
            this.params.vectorField ? 25 : 15).step(1).onFinishChange(this.markOrbitDirty.bind(this));
        this.gui.add(this.params, 'polygonFill').name('Fill starting')
            .onFinishChange(this.markDrawDirty.bind(this));
        this.gui.add(this.params, 'polygonSides').name('Recurrences')
            .onFinishChange(this.markDrawDirty.bind(this));
        this.gui.add(this.params, 'vertexOrbits').name('Vertex dots')
            .onFinishChange(this.markDrawDirty.bind(this));
        this.gui.add(this.params, 'vertexPaths').name('Vertex paths')
            .onFinishChange(this.markDrawDirty.bind(this));
        this.gui.add(this.params, 'inscribed').name('Inscribed')
            .onFinishChange(this.updateTable.bind(this));

        this.gui.open();
    }

    markOrbitDirty() {
        this.orbitDirty = true;
    }

    markDrawDirty() {
        this.drawDirty = true;
    }

    resetVertices() {
        this.selectedVertex = 0;
        const points = [];
        this.scene.remove(...this.draggables);
        while (this.draggables.length) this.draggables.pop();
        const n = this.params.n;
        const dtheta = Math.PI * 2 / n;
        const offset = Math.PI / n - Math.PI / 2;
        for (let i = 0; i < n; i++) {
            const theta = i * dtheta + offset;
            const c = Complex.polar(1, theta);
            points.push(c.toVector2());
        }
        if (n === 3) {
            // points[0] = new Vector2(0.0, 0.0);
            // points[1] = new Vector2(1.4178836443539518, 0);
            // points[2] = new Vector2(1.2738894805322747, 1.4105529801151528);
            points[0] = new Vector2(0.0, 0.0);
            points[1] = new Vector2(1.208753082624802, 0);
            points[2] = new Vector2(1.5774412642385192, 1.6545976417756127);
        }
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const dot = new Mesh(
                new CircleGeometry(0.015, 16),
                new MeshBasicMaterial({color: new Color().setHSL(i / n, 1, 0.6)}));
            dot.translateX(p.x);
            dot.translateY(p.y);
            dot.translateZ(0.01);
            this.draggables.push(dot);
            this.scene.add(dot);
        }
        this.polygonDirty = true;
        this.updateTable();
    }

    vertexDragStart() {
        this.dragging = true;
    }

    vertexDrag() {
        this.updateTable();
    }

    vertexDragEnd() {
        this.dragging = false;
        this.updateTable();
    }

    updateTable() {
        this.polygonDirty = false;

        this.scene.remove(this.polygon);
        if (this.params.inscribed) {
            for (let v of this.draggables) {
                const n = v.position.normalize();
                v.position.set(n.x, n.y, 0);
            }
        }
        let vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
        let shape = new THREE.Shape(vertices);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({color: FILL_COLOR});
        this.polygon = new THREE.Mesh(geometry, material);
        this.scene.add(this.polygon);

        this.orbitDirty = true;
        this.drawDirty = true;
    }

    moving(): boolean {
        let arrowKey = this.keysPressed.get('ArrowLeft') === true ||
            this.keysPressed.get('ArrowRight') === true ||
            this.keysPressed.get('ArrowUp') === true ||
            this.keysPressed.get('ArrowDown') === true;
        return this.dragging || arrowKey;
    }

    computeVectorFieldTrajectory() {
        console.clear();
        let centerPoints = [];
        const steps = (this.moving() ? Math.min(this.iterations, 100) : this.iterations);
        const dt = Math.pow(10, this.params.timeStep);
        let vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
        const n = vertices.length;
        const paths: Vector2[][] = vertices.map(v => [v.clone()]);

        const initialLengths: number[] = [];
        for (let i = 0; i < n; i++) {
            initialLengths.push(vertices[i].distanceTo(vertices[(i + 1) % n]));
        }
        const initialVertices = vertices.map(v => v.clone());
        let bestDLS = 1;
        let X = new Vector2();
        let D = 0;
        let found = false;
        for (let i = 0; i < steps; i++) {
            const newVertices = [];
            for (let j = 0; j < n; j++) {
                const vp = vertices[(j + n - 1) % n];
                const v = vertices[j];
                const vn = vertices[(j + 1) % n];

                const u = v.clone().sub(vp).normalize().add(vn.clone().sub(v).normalize());

                const newV = v.add(u.multiplyScalar(dt));
                newVertices.push(newV);
                paths[j].push(newV.clone());
            }
            vertices = newVertices;
            const currentLengths: number[] = [];
            for (let j = 0; j < n; j++) {
                currentLengths.push(vertices[j].distanceTo(vertices[(j + 1) % n]));
            }
            let dls = 0;
            for (let j = 0; j < n; j++) {
                dls += Math.pow(currentLengths[j] - initialLengths[(j + 1) % n], 2);
            }
            if (dls < 0.000_1) {
                if (dls < bestDLS) {
                    bestDLS = dls;
                    const p1 = Complex.fromVector2(initialVertices[(1) % n]);
                    const p2 = Complex.fromVector2(vertices[(0) % n]);
                    const q1 = Complex.fromVector2(initialVertices[(2) % n]);
                    const q2 = Complex.fromVector2(vertices[(1) % n]);
                    const perp1 = GeoLine.throughTwoPoints(p1, p2).perpAtPoint(new LineSegment(p1, p2).mid);
                    const perp2 = GeoLine.throughTwoPoints(q1, q2).perpAtPoint(new LineSegment(q1, q2).mid);
                    X = perp1.intersectLine(perp2).toVector2();
                    const L = GeoLine.throughTwoPoints(initialVertices[(1 + n) % n], initialVertices[(2 + n) % n]);
                    const P = L.perpAtPoint(X);
                    D = X.distanceTo(L.intersectLine(P).toVector2());
                } else if (!found) {
                    const v0 = initialVertices[0];
                    centerPoints.push(X);
                    console.log(`(${v0.x}, ${v0.y}), (${X.x}, ${X.y})`);
                    // for (let v of vertices) {
                    //     console.log(`    ${X.distanceTo(v)}`);
                    // }
                    // console.log(D);
                    found = true;
                }
            } else {
                found = false;
                bestDLS = 1;
            }
        }
        this.vertexPaths = [];
        for (let i = 0; i < n; i++) {
            this.vertexPaths.push(new Line(
                new BufferGeometry().setFromPoints(paths[i]),
                new LineBasicMaterial({
                    color: this.vertexColor(i, n)
                }))
            );
        }
        let material = new PointsMaterial({color: OUTER_ORBIT_COLOR});
        if (vertices.length == 3) {
            this.centers = new Points(new BufferGeometry().setFromPoints(centerPoints), material);
        }
    }

    computeMapTrajectory() {
        this.centers = new Points();

        const data: number[][] = [];

        let material = new PointsMaterial({color: OUTER_ORBIT_COLOR});
        const it = (this.moving() ? Math.min(this.iterations, 100) : this.iterations);
        let vertices = this.draggables.map(d => new Vector2(d.position.x, d.position.y));
        let n = vertices.length;
        let paths: Vector2[][] = [];
        for (let i = 0; i < n; i++) {
            paths.push([vertices[i]]);
        }
        let initialLengths = [];
        for (let i = 0; i < n; i++) {
            initialLengths.push(vertices[i].distanceTo(vertices[(i + 1) % n]));
        }
        this.images.push(new Line(
            new BufferGeometry().setFromPoints(vertices.concat([vertices[0]])),
            material));
        for (let i = 0; i < it; i++) {
            try {
                vertices = this.iterate(vertices);
                vertices = this.iterate(vertices);
            } catch (e) {
                console.log(e);
                break;
            }
            // this.images.push(new Line(
            //     new BufferGeometry().setFromPoints(vertices.concat([vertices[0]])),
            //     material));
            let dataRow = [];
            for (let j = 0; j < n; j++) {
                paths[j].push(vertices[j]);
                dataRow.push(vertices[j].distanceTo(vertices[(j + 1) % n]));
            }
            data.push(dataRow);
            let d = 0;
            for (let j = 0; j < n; j++) {
                d += Math.pow(dataRow[j] - initialLengths[j], 2);
            }
            if (d < 0.000_001) {
                this.images.push(new Line(
                    new BufferGeometry().setFromPoints(vertices.concat([vertices[0]])),
                    material));
                initialLengths = dataRow;
            }
        }
        for (let i = 0; i < n; i++) {
            this.vertexPaths.push(new Line(
                new BufferGeometry().setFromPoints(paths[i]),
                new LineBasicMaterial({
                    color: this.vertexColor(i, n)
                })));
            this.vertexOrbits.push(new Points(
                new BufferGeometry().setFromPoints(paths[i]),
                new PointsMaterial({
                    color: this.vertexColor(i, n)
                })));
        }
        // console.clear();
        // for (let j = 1; j < data.length; j++) {
        //     let row = data[j];
        //     let d = 0;
        //     for (let i = 0; i < n; i++) {
        //         d += Math.pow(row[i] - initialLengths[i], 2);
        //     }
        //     if (d < 0.000_001) {
        //         console.log(`Side lengths return after ${j} iterations.`)
        //     }
        // }
    }

    vertexColor(i: number, n: number): Color {
        return new Color().setHSL(i / n, 1, 0.75);
    }

    updateOrbit() {
        this.orbitDirty = false;
        this.drawDirty = true;

        this.vertexPaths = [];
        this.vertexOrbits = [];
        this.images = [];
        if (this.params.vectorField) {
            this.computeVectorFieldTrajectory();
        } else {
            this.computeMapTrajectory();
        }
    }

    // triangleCenter(vertices: Vector2[]): Vector2 {
    //     let lens = [];
    //     let n = vertices.length;
    //     let perimeter = 0;
    //     for (let i = 0; i < vertices.length; i++) {
    //         let v1 = vertices[(i + 1) % n];
    //         let v2 = vertices[(i + 2) % n];
    //         let l = v1.clone().sub(v2.clone()).length();
    //         lens.push(l);
    //         perimeter += l;
    //     }
    //     let x = 0;
    //     let y = 0;
    //     for (let i = 0; i < n; i++) {
    //         x += vertices[i].x * lens[i] / perimeter;
    //         y += vertices[i].y / perimeter;
    //     }
    //     return new Vector2(x, y);
    // }

    updateDraw() {
        this.drawDirty = false;

        this.scene.clear();
        if (this.params.polygonFill) {
            this.scene.add(this.polygon);
        }
        if (this.params.polygonSides && !this.params.vectorField) {
            for (let ls of this.images) this.scene.add(ls);
        }
        if (this.params.vertexPaths || this.params.vectorField) {
            for (let ls of this.vertexPaths) this.scene.add(ls);
        }
        if (this.params.vertexOrbits && !this.params.vectorField) {
            for (let ls of this.vertexOrbits) this.scene.add(ls);
        }
        if (this.params.centers || this.params.vectorField) {
            this.scene.add(this.centers);
        }
        for (let i = 0; i < this.draggables.length; i++) {
            const d = this.draggables[i];
            if (i == this.selectedVertex) {
                d.scale.set(2, 2, 1);
            } else {
                d.scale.set(1, 1, 1);
            }
            this.scene.add(d);
        }
    }

    iterate(vertices: Vector2[], epsilon = this.params.e) {
        return iterate(vertices, epsilon);
    }

    get iterations(): number {
        return Math.pow(2, this.params.iterations);
    }
}

export function iterate(vertices: Vector2[], epsilon: number) {
    let interiorAngles = [];
    let headings = [];
    let sideLengths = [];
    let n = vertices.length;
    for (let i = 0; i < n; i++) {
        let v0 = vertices[((i + n) - 1) % n];
        let v1 = vertices[i];
        let v2 = vertices[(i + 1) % n];
        let l1 = v1.distanceTo(v2);
        if (l1 < epsilon * 2) {
            // console.log("Too close!");
            throw Error("Too close!");
        }

        let h1 = v2.clone().sub(v1.clone()).angle();
        let h2 = v0.clone().sub(v1.clone()).angle();

        interiorAngles.push(normalizeAngle(h2 - h1, 0));
        headings.push(h2);
        sideLengths.push(l1);
    }
    let angleError = interiorAngles[0] / 2;
    let guessAngle = headings[0] + interiorAngles[0] / 2;
    let guessVertices = [];
    let safety = 0;
    while (Math.abs(angleError) > 0.000_000_000_001 && safety < 100) {
        guessVertices = [];
        safety += 1;
        let guessPoint = vertices[0].clone().add(
            new Vector2(epsilon * Math.cos(guessAngle), epsilon * Math.sin(guessAngle))
        );
        for (let i = n; i > 0; i--) {
            // intersect line from v[i + 1] to guessPoint
            const intersections = new AffineCircle(Complex.fromVector2(vertices[(i + n - 1) % n]), epsilon).intersectLine(
                GeoLine.throughTwoPoints(vertices[(i + n - 1) % n], guessPoint));
            let intersection;
            if (intersections.length == 1) {
                intersection = intersections[0];
            } else if (intersections.length == 2) {
                let d1 = intersections[0].distance(Complex.fromVector2(guessPoint));
                let d2 = intersections[1].distance(Complex.fromVector2(guessPoint));
                intersection = d1 < d2 ? intersections[0] : intersections[1];
            } else {
                throw new Error('No intersections, but there should be!');
            }
            guessPoint = intersection.toVector2();
            guessVertices.push(intersection.toVector2());
        }
        let resultAngle = normalizeAngle(guessPoint.clone().sub(vertices[0].clone()).angle() - headings[0], 0);
        angleError = resultAngle - guessAngle;
        guessAngle = headings[0] + resultAngle;
    }
    let newVertices = [];
    for (let i = 0; i < n; i++) {
        let v0 = guessVertices[i];
        let v1 = guessVertices[(i + 1) % n];
        let d = v0.clone().sub(v1).normalize().multiplyScalar(epsilon);
        newVertices.push(v0.clone().add(d));
    }
    newVertices.reverse();
    return newVertices;
}
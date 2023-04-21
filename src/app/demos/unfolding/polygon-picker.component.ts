import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    AxesHelper,
    BufferGeometry,
    CircleGeometry,
    Color,
    LineBasicMaterial,
    LineSegments,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Vector2,
    Vector3
} from "three";
import {DragControls} from "three/examples/jsm/controls/DragControls";
import {normalizeAngle} from "../../../math/math-helpers";
import {reflectOver} from "./unfolding.component";

const CLEAR_COLOR = new Color(0x123456);
const POINT_RADIUS = 0.05;

export enum Restriction {
    CONVEX = 'Convex',
    KITE = 'Kite',
    CENTRAL = 'Central',
}

@Component({
    selector: 'polygon-picker',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class PolygonPickerComponent extends ThreeDemoComponent implements OnChanges {

    @Input() restriction: Restriction = Restriction.CONVEX;

    @Output() verticesEvent = new EventEmitter<Vector2[]>();

    draggables: Mesh[] = [];
    dragControls: DragControls;

    private mat = new MeshBasicMaterial({color: 0xffffff});
    private geo = new CircleGeometry(POINT_RADIUS);

    dirty = true;

    constructor() {
        super();
        this.useOrthographic = true;
        this.orthographicDiagonal = 3;
        this.updateOrthographicCamera();
        this.renderer.setClearColor(CLEAR_COLOR);

        this.reset();

        this.dragControls = new DragControls(this.draggables, this.camera, this.renderer.domElement);

        // this.dragControls.addEventListener('dragstart', event => console.log(event));
        this.dragControls.addEventListener('drag', this.drag.bind(this));
        this.dragControls.addEventListener('dragend', this.dragEnd.bind(this));

        document.addEventListener('pointerdown', this.pointerdown.bind(this), {capture: true});
        // document.addEventListener('mouseup', this.mouseup.bind(this));
    }

    ngOnChanges(changes: SimpleChanges) {
        this.reset();
    }

    private drag(event: any) {
        switch (this.restriction) {
        case Restriction.KITE:
            const v0 = new Vector2(this.draggables[0].position.x, this.draggables[0].position.y);
            const v1 = new Vector2(this.draggables[1].position.x, this.draggables[1].position.y);
            const v2 = new Vector2(this.draggables[2].position.x, this.draggables[2].position.y);
            const v3 = new Vector2(this.draggables[3].position.x, this.draggables[3].position.y);
            if (event.object === this.draggables[0]) {
                const ref = reflectOver(v1, v3, v0);
                this.draggables[2].position.x = ref.x;
                this.draggables[2].position.y = ref.y;
            } else if (event.object === this.draggables[2]) {
                const ref = reflectOver(v1, v3, v2);
                this.draggables[0].position.x = ref.x;
                this.draggables[0].position.y = ref.y;
            } else if (event.object === this.draggables[1]) {
                const d = v3.distanceTo(v2);
                const t0 = v0.clone().sub(v3).angle();
                const t2 = v2.clone().sub(v3).angle();
                const t1 = v1.clone().sub(v3).angle();
                let theta = (normalizeAngle(t2, t0) - t0) / 2;
                if (theta > Math.PI / 2) theta = Math.PI - theta;
                this.draggables[0].position.x = v3.x + d * Math.cos(t1 - theta);
                this.draggables[0].position.y = v3.y + d * Math.sin(t1 - theta);
                this.draggables[2].position.x = v3.x + d * Math.cos(t1 + theta);
                this.draggables[2].position.y = v3.y + d * Math.sin(t1 + theta);
            } else if (event.object === this.draggables[3]) {
                const d = v1.distanceTo(v2);
                const t0 = v0.clone().sub(v1).angle();
                const t2 = v2.clone().sub(v1).angle();
                const t3 = v3.clone().sub(v1).angle();
                let theta = (normalizeAngle(t2, t0) - t0) / 2;
                if (theta > Math.PI / 2) theta = Math.PI - theta;
                this.draggables[0].position.x = v1.x + d * Math.cos(t3 - theta);
                this.draggables[0].position.y = v1.y + d * Math.sin(t3 - theta);
                this.draggables[2].position.x = v1.x + d * Math.cos(t3 + theta);
                this.draggables[2].position.y = v1.y + d * Math.sin(t3 + theta);
            }
            break;
        case Restriction.CENTRAL:
            const p0 = new Vector2(this.draggables[0].position.x, this.draggables[0].position.y);
            const p1 = new Vector2(this.draggables[1].position.x, this.draggables[1].position.y);
            const p2 = new Vector2(this.draggables[2].position.x, this.draggables[2].position.y);
            const p3 = new Vector2(this.draggables[3].position.x, this.draggables[3].position.y);
            const p4 = new Vector2(this.draggables[4].position.x, this.draggables[4].position.y);
            const p5 = new Vector2(this.draggables[5].position.x, this.draggables[5].position.y);
            const com = new Vector2()
                .add(p0)
                .add(p1)
                .add(p2)
                .add(p3)
                .add(p4)
                .add(p5)
                .multiplyScalar(1 / 6);
            if (event.object === this.draggables[0]) {
                this.draggables[3].position.x = 2 * com.x - p0.x;
                this.draggables[3].position.y = 2 * com.y - p0.y;
            } else if (event.object === this.draggables[1]) {
                this.draggables[4].position.x = 2 * com.x - p1.x;
                this.draggables[4].position.y = 2 * com.y - p1.y;
            } else if (event.object === this.draggables[2]) {
                this.draggables[5].position.x = 2 * com.x - p2.x;
                this.draggables[5].position.y = 2 * com.y - p2.y;
            } else if (event.object === this.draggables[3]) {
                this.draggables[0].position.x = 2 * com.x - p3.x;
                this.draggables[0].position.y = 2 * com.y - p3.y;
            } else if (event.object === this.draggables[4]) {
                this.draggables[1].position.x = 2 * com.x - p4.x;
                this.draggables[1].position.y = 2 * com.y - p4.y;
            } else if (event.object === this.draggables[5]) {
                this.draggables[2].position.x = 2 * com.x - p5.x;
                this.draggables[2].position.y = 2 * com.y - p5.y;
            }
            break;
        }
        this.markDirty();
    }

    processKeyboardInput(dt: number) {
        let vDiff = 0;
        let aDiff = 0;
        if (this.keysPressed.get('ArrowLeft')) aDiff += dt * 0.1;
        if (this.keysPressed.get('ArrowRight')) aDiff -= dt * 0.1;
        if (this.keysPressed.get('ArrowUp')) vDiff += dt * 0.1;
        if (this.keysPressed.get('ArrowDown')) vDiff -= dt * 0.1;
        if (aDiff !== 0 || vDiff !== 0) {
            const r = new Matrix4().makeRotationZ(aDiff);
            for (let d of this.draggables) {
                d.position.y += vDiff;
                d.position.applyMatrix4(r);
            }
            this.markDirty();
        }
    }

    private reset() {
        while (this.draggables.length > 0) {
            this.draggables.pop();
        }
        switch (this.restriction) {
        case Restriction.CENTRAL:
        case Restriction.CONVEX:
            const n = 6;
            for (let i = 0; i < n; i++) {
                const v = polar(1, i * 2 * Math.PI / n + 0.1234);
                this.draggables.push(this.dot(v));
            }
            break;
        case Restriction.KITE:
            this.draggables.push(this.dot(new Vector2(1, 1)));
            this.draggables.push(this.dot(new Vector2(0, 2)));
            this.draggables.push(this.dot(new Vector2(-1, 1)));
            this.draggables.push(this.dot(new Vector2(0, -2)));
            break;
        }
        this.markDirty();
    }

    private dot(v: Vector2): Mesh {
        const d = new Mesh(this.geo, this.mat);
        d.translateX(v.x);
        d.translateY(v.y);
        return d;
    }

    pointerdown(event: MouseEvent) {
        if (this.restriction !== Restriction.CONVEX) return;
        // find location in world
        const screenX = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        const screenY = 1 - (event.clientY / this.renderer.domElement.clientHeight) * 2;
        // console.log(screenX, screenY);
        if (screenX < -1 || screenX > 1 || screenY < -1 || screenY > 1) {
            return;
        }

        const world = new Vector3(screenX, screenY).unproject(this.camera);
        const point = new Vector2(world.x, world.y);
        const objects = this.dragControls.getObjects();
        const vertices = objects.map(o => new Vector2(o.position.x, o.position.y));
        for (let v of vertices) {
            if (v.distanceTo(point) <= POINT_RADIUS) {
                return;
            }
        }

        const [hull, _] = convexHull(vertices);
        if (!hullContainsPoint(hull, point)) {
            return;
        }

        const d = new Mesh(this.geo, this.mat);
        d.translateX(point.x);
        d.translateY(point.y);
        this.draggables.push(d);
        this.scene.add(d);

        this.renderer.render(this.scene, this.camera);
        this.markDirty();
    }

    dragEnd() {
        if (this.restriction !== Restriction.CONVEX) return;
        const objects = this.dragControls.getObjects();
        const vertices = objects.map(o => new Vector2(o.position.x, o.position.y));
        const [hull, _] = convexHull(vertices);
        while (this.draggables.length > 0) {
            this.draggables.pop();
        }
        for (let v of hull) {
            const d = new Mesh(this.geo, this.mat);
            d.translateX(v.x);
            d.translateY(v.y);
            this.draggables.push(d);
            this.scene.add(d);
        }
        this.markDirty();
    }

    markDirty() {
        this.dirty = true;
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);
        if (this.dirty) {
            this.dirty = false;

            this.scene.clear();
            const axesHelper = new AxesHelper(1);
            this.scene.add(axesHelper);
            const objects = this.dragControls.getObjects();
            this.scene.add(...objects);
            const vertices = objects.map(o => new Vector2(o.position.x, o.position.y));
            let hull = [...vertices];
            if (this.restriction === Restriction.CONVEX) {
                hull = convexHull(vertices)[0];
            }
            this.verticesEvent.emit(hull);

            const polyPoints = [];
            for (let i = 0; i < hull.length; i++) {
                polyPoints.push(hull[i], hull[(i + 1) % hull.length]);
            }

            const polyGeo = new BufferGeometry().setFromPoints(polyPoints);
            const polyMat = new LineBasicMaterial({color: 0xffffff});

            const poly = new LineSegments(polyGeo, polyMat);
            this.scene.add(poly);
        }
    }
}

function polar(radius: number, theta: number): Vector2 {
    return new Vector2(
        radius * Math.cos(theta),
        radius * Math.sin(theta),
    );
}

function convexHull(points: Vector2[]): Vector2[][] {
    if (points.length < 3) return [[...points], []];
    // leftmost point (in case of tie, choose bottommost):
    let bestX = Number.POSITIVE_INFINITY;
    let bestY = Number.POSITIVE_INFINITY;
    let startI = -1;
    for (let [i, point] of points.entries()) {
        if (point.x < bestX || (point.x === bestX && point.y < bestY)) {
            bestX = point.x;
            bestY = point.y;
            startI = i;
        }
    }

    const hull: Vector2[] = [];
    const start = points[startI];
    let current = start;
    let baseAngle = -Math.PI;
    let steps = 0;
    do {
        let bestAngle = Number.POSITIVE_INFINITY;
        let bestDistSq = Number.NEGATIVE_INFINITY;
        let bestJ = -1;
        for (let [i, point] of points.entries()) {
            const distSq = point.distanceToSquared(current);
            if (distSq === 0) continue;
            const angle = normalizeAngle(point.clone().sub(current).angle(), baseAngle);
            if (angle < bestAngle || (angle === bestAngle && distSq > bestDistSq)) {
                bestAngle = angle;
                bestDistSq = distSq;
                bestJ = i;
            }
        }
        baseAngle = bestAngle;
        current = points[bestJ];
        hull.push(current);
        steps++;
    } while (current.distanceToSquared(start) > 0 && steps < points.length);

    const antihull = points.filter(v => !!hull.find(h => h === v));
    return [hull, antihull];
}

function hullContainsPoint(hull: Vector2[], point: Vector2): boolean {
    const angles = hull.map(v => v.clone().sub(point).angle()); // in range [-π, π)
    for (let i = 0; i < angles.length; i++) {
        const a1 = angles[i];
        const a2 = angles[(i + 1) % angles.length];
        if (normalizeAngle(a2, a1) - a1 > Math.PI) return false;
    }
    return true;
}
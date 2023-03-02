import {Component, EventEmitter, Output} from '@angular/core';
import {Vector3} from "three";
import {PerspectiveCamera} from "../../../../graphics/camera/perspective-camera";
import {WindowPaneComponent} from "../../../widgets/window-pane/window-pane.component";
import {Color} from "../../../../graphics/shapes/color";
import {Sphere} from "../../../../graphics/shapes/sphere";
import {Polyhedron} from "../../../../math/geometry/polyhedron";
import {Polygon3D} from "../../../../math/geometry/polygon3D";
import {Plane} from "../../../../math/geometry/plane";
import {Line3D, LineSegment3D} from "../../../../math/geometry/line3D";
import {
    HOBResults,
    HOBSettings,
    HyperbolicOuterBilliards
} from "../../../../math/hyperbolic/hyperbolic-outer-billiards";

@Component({
    selector: 'point-picker',
    templateUrl: '../../../widgets/window-pane/window-pane.component.html',
    styleUrls: ['../../../widgets/window-pane/window-pane.component.sass']
})
export class PointPickerComponent extends WindowPaneComponent {

    @Output('point')
    pointEvent = new EventEmitter<Vector3>();
    private mouseX = -1;
    private mouseY = -1;
    private polyhedron!: Polyhedron;
    private plane!: Plane;
    private sheet: Polygon3D | null = null;
    private point = new Vector3(1, 1, 1);
    private sphere!: Sphere;

    private theta = Math.PI / 4;
    private rho = Math.PI / 4;

    private samples = 0;
    private results = new HOBResults();
    private settings = new HOBSettings();
    private hob!: HyperbolicOuterBilliards;

    override init() {
        super.init();
        this.camera = new PerspectiveCamera();
        this.updateCamera();
        this.camera.setAspectRatio(this.canvas.width / this.canvas.height);
        this.camera.setZoom(0.3);

        const epsilon = 0.01;
        const v0 = new Vector3(epsilon, epsilon, epsilon);
        const v1 = new Vector3(Math.PI, epsilon, epsilon);
        const v2 = new Vector3(epsilon, Math.PI, epsilon);
        const v3 = new Vector3(epsilon, epsilon, Math.PI);

        this.polyhedron = new Polyhedron([
            new Polygon3D([v0, v3, v1]),
            new Polygon3D([v0, v1, v2]),
            new Polygon3D([v0, v2, v3]),
            new Polygon3D([v1, v3, v2]),
        ]);

        this.scene.set('polyhedron', this.polyhedron.toMesh(
            this.gl,
            undefined,
            Color.MANGO));

        this.hob = new HyperbolicOuterBilliards(this.gl, this.results);

        // this.sphere = new Sphere(this.gl, 0.05, this.point, Color.BLUE);
        // this.setSelectable();

        // this.updateSheet();
        // this.scene.set('sphere', this.sphere);
        // this.pointEvent.emit(this.point);
    }

    override frame(dt: number) {
        super.frame(dt);

        if (this.samples > 10000) return;
        this.samples++;
        const a1 = Math.random();
        const a2 = Math.random();
        const a3 = Math.random();
        // if (a1 > a2 || a2 > a3) return;
        const st = [a1, a2, a3].sort();
        // const l = Math.random() * Math.PI * 0.15 + Math.PI * 0.85;
        const l = Math.PI * 0.95;
        const s = a1 + a2 + a3;
        const angleA = st[0] * l / s;
        const angleB = st[1] * l / s;
        const angleC = st[2] * l / s;
        this.hob.setSettings({...this.settings, searchIterations: 3, angleA, angleB, angleC})
        let color = Color.RED;
        try {
            this.hob.triangleFromAngles();
            color = this.results.hasOrbit ? Color.GREEN : Color.RED;
        } catch (e) {
            return;
        }
        const sphere = new Sphere(this.gl, 0.005, new Vector3(angleA, angleB, angleC), color);
        this.scene.set(`sample_${angleA}_${angleB}_${angleC}`, sphere);
    }

    override draw() {
        super.draw();
    }

    override mouseDown(x: number, y: number) {
        super.mouseDown(x, y);
        if (this.selectedID === 0) {
            this.dragging = true;
            this.mouseX = x;
            this.mouseY = y;
        }
    }

    override mouseMove(x: number, y: number) {
        super.mouseMove(x, y);
        if (this.selectedID !== 0 || !this.dragging) return;
        const dx = 2 * (x - this.mouseX) / this.canvas.width;
        const dy = 2 * (y - this.mouseY) / this.canvas.height;
        this.theta -= dx;
        this.rho = Math.min(Math.PI - 0.01, Math.max(0.01, this.rho - dy));
        this.updateCamera();
        // this.updateSheet();

        this.mouseX = x;
        this.mouseY = y;
    }

    private setSelectable() {
        const ths = this;
        const s = {
            ...WindowPaneComponent.getSelectable(1),
            drawable: this.sphere,
            mouseMove(x: number, y: number) {
                ths.dragPoint(x, y);
            }
        }
        this.addSelectable(`point`, s);
    }

    dragPoint(x: number, y: number) {
        // Project the pointer onto the plane
        const xScreen = x * WindowPaneComponent.ANTI_ALIASING / this.canvas.width * 2 - 1;
        const yScreen = 1 - y * WindowPaneComponent.ANTI_ALIASING / this.canvas.height * 2;

        const mystery = 0.7125;

        const p = this.camera.getForward()
            .add(this.camera.getRight().setLength(xScreen * this.camera.getZoom() * mystery))
            .add(this.camera.getUp().setLength(yScreen * this.camera.getZoom() * mystery));
        const candidate = new Line3D(
            this.camera.getPosition(),
            p,
        ).intersectPlane(this.plane);
        if (candidate === null) throw Error('Unexpectedly no projection');
        let closest = candidate;
        const ls = new LineSegment3D(this.point, candidate);
        for (let f of this.polyhedron.faces) {
            const stop = ls.intersectPlane(f.plane);
            if (stop && stop.distanceTo(this.point) < this.point.distanceTo(closest)) {
                const toStop = stop.clone().sub(this.point).setLength(0.001);
                closest = stop.sub(toStop);
            }
        }
        this.point = closest;
        this.pointEvent.emit(this.point);
        this.sphere.recenter(this.point.x, this.point.y, this.point.z);
        this.setSelectable();
    }

    private updateCamera() {
        const p = new Vector3(
            Math.sin(this.rho) * Math.cos(this.theta),
            Math.sin(this.rho) * Math.sin(this.theta),
            Math.cos(this.rho),
        );
        this.camera.setPosition(p.clone().multiplyScalar(10).add(new Vector3(1, 1, 1)));
        this.camera.setForward(p.clone().multiplyScalar(-1));
        this.camera.setUp(new Vector3(0, 0, 1));
    }

    private updateSheet() {
        this.plane = Plane.fromPointAndNormal(this.point, this.camera.getForward().multiplyScalar(-1));
        this.sheet = this.polyhedron.intersectPlane(this.plane);
        if (this.sheet) {
            this.scene.set('sheet', this.sheet.toMesh(
                this.gl,
                new Color(Color.TURQUOISE.r, Color.TURQUOISE.g, Color.TURQUOISE.b, 0.25),
                Color.MAGENTA,
            ));
        }
    }

    override mouseUp(x: number, y: number) {
        super.mouseUp(x, y);
        this.dragging = false;
        this.mouseX = -1;
        this.mouseY = -1;
    }
}

import {Component} from "@angular/core";
import {convexHull, PolygonPickerComponent, PolygonRestriction} from "../../widgets/polygon-picker.component";
import {GUI} from "dat.gui";
import {BufferGeometry, Line, LineBasicMaterial, LineSegments, Matrix3, Vector2, Vector3} from "three";
import {Line as GeoLine} from "../../../math/geometry/line";
import {Complex} from "../../../math/complex";

@Component({
    selector: 'triangle-map',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass'],
})
export class PolygonMapComponent extends PolygonPickerComponent {
    params = {
        iterations: 10,
        everyOther: true,
        showAffine: true,
        convex: false,
        inner: true,
    }

    images: LineSegments = new LineSegments();
    finalImage: Line = new Line();
    affineFinal: Line = new Line();

    gui: GUI;

    constructor() {
        super();
        this.restriction = PolygonRestriction.NONE;
        this.useOrthographic = true;
        this.reset(5, 0, 0);
        this.gui = new GUI();
        this.updateGUI();
    }

    updateGUI() {
        this.gui.destroy();
        this.gui = new GUI();
        this.gui.add(this.params, 'iterations').name('Iterations').min(1).max(100).step(1).onFinishChange(() => {
            this.markDirty();
        });
        this.gui.add(this.params, 'everyOther').name('Hide every other').onFinishChange(() => {
            this.markDirty();
        });
        this.gui.add(this.params, 'showAffine').name('Show affine image').onFinishChange(() => {
            this.markDirty();
        });
        this.gui.add(this.params, 'convex').name('Convex').onFinishChange(() => {
            this.restriction = this.params.convex ? PolygonRestriction.CONVEX : PolygonRestriction.NONE;
            this.markDirty();
        });
        this.gui.add(this.params, 'inner').name('Inner').onFinishChange(() => {
            this.params.showAffine = this.params.inner;
            this.markDirty();
        });
        this.gui.open();
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
        this.gui.destroy();
    }

    override processKeyboardInput(dt: number) {

    }

    override frame(dt: number) {
        const recompute = this.dirty;
        super.frame(dt);
        if (recompute) {
            this.iterate();
            this.scene.add(this.images);
            this.scene.add(this.finalImage);
            if (this.params.showAffine) this.scene.add(this.affineFinal);
        }
    }

    // override reset() {
    //
    // }

    iterate() {
        console.log('recomputing!');
        const ls = [];
        let vertices = this.draggables.map((v) => new Vector2(v.position.x, v.position.y));
        let polygon = this.params.convex ? convexHull(vertices)[0] : vertices;
        let finalPolygon = polygon;
        let area = convexArea(polygon);
        let q = quantity(polygon);
        let n = polygon.length;
        for (let i = 0; i < this.params.iterations; i++) {
            let newPolygon = [];

            let err = false;
            if (this.params.inner) {
                let lines: GeoLine[] = [];
                for (let j = 0; j < n; j++) {
                    let v1 = polygon[j];
                    let v2 = polygon[(j + 1) % n];
                    let v3 = polygon[(j + 2) % n];
                    lines.push(GeoLine.srcDir(new Complex(v2.x, v2.y), new Complex(v3.x - v1.x, v3.y - v1.y)));
                }
                try {
                    for (let j = 0; j < n; j++) {
                        let l1 = lines[j];
                        let l2 = lines[(j + 1) % n];
                        newPolygon.push(l1.intersectLine(l2).toVector2())
                    }
                } catch (e) {
                    console.log(e);
                    break;
                }
                let sa = Math.sqrt(area / convexArea(newPolygon));
                for (let j = 0; j < n; j++) {
                    newPolygon[j] = newPolygon[j].multiplyScalar(sa);
                }
            } else {
                let circleCenters: Vector2[] = [];
                try {
                    for (let j = 0; j < n; j++) {
                        let v0 = polygon[(j - 1 + n) % n];
                        let v1 = polygon[j];
                        let v2 = polygon[(j + 1) % n];
                        let v3 = polygon[(j + 2) % n];
                        let s1 = v1.clone().sub(v0).normalize();
                        let s2 = v2.clone().sub(v1).normalize();
                        let s3 = v3.clone().sub(v2).normalize();
                        let b1 = s1.clone().add(s2);
                        let b2 = s2.clone().add(s3).multiplyScalar(-1);
                        let l1 = GeoLine.srcDir(v1, b1);
                        let l2 = GeoLine.srcDir(v2, b2);
                        let center = l1.intersectLine(l2);
                        newPolygon.push(GeoLine.throughTwoPoints(v1, v2).project(center).toVector2());
                    }
                } catch (e) {
                    console.log(e);
                    err = true;
                    break;
                }
            }

            if (err) break;

            if (i % 2 == 1 || !this.params.everyOther) {
                for (let j = 0; j < n; j++) {
                    let p1 = newPolygon[j];
                    let p2 = newPolygon[(j + 1) % n];
                    ls.push(p1, p2);
                }
                finalPolygon = newPolygon;
            }

            let newQ = quantity(newPolygon);
            console.log(newQ / q, newQ);
            q = newQ;

            polygon = newPolygon;
        }

        this.images = new LineSegments(new BufferGeometry().setFromPoints(ls), new LineBasicMaterial({color: 0xaa44aa}));
        this.finalImage = new Line(
            new BufferGeometry().setFromPoints(finalPolygon.concat([finalPolygon[0]])),
            new LineBasicMaterial({color: 0x00ff00})
        );

        if (this.params.inner) {
            const at = affineTransformation(finalPolygon);
            let affinePoints = finalPolygon.map((v) => {
                let tv = new Vector3(v.x, v.y, 1).applyMatrix3(at);
                return new Vector2(tv.x, tv.y);
            });

            this.affineFinal = new Line(
                new BufferGeometry().setFromPoints(affinePoints.concat(affinePoints[0])),
                new LineBasicMaterial({color: 0xffff00})
            );
            this.affineFinal.translateX(2);
        }
    }
}

function quantity(vertices: Vector2[]) {
    let s = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % n];
        const v3 = vertices[(i + 2) % n];
        const v4 = vertices[(i + 3) % n];
        s += Math.pow(v3.clone().sub(v2).cross(v1.clone().sub(v4)), 2);
    }
    return s / Math.pow(convexArea(vertices), 2);
}

function convexArea(vertices: Vector2[]): number {
    let s = 0;
    let n = vertices.length;
    let v0 = vertices[0];
    for (let i = 1; i < n - 1; i++) {
        let v1 = vertices[i];
        let v2 = vertices[i + 1];
        s += (v1.clone().sub(v0)).cross(v2.clone().sub(v0)) / 2;
    }
    return Math.abs(s);
}

function affineTransformation(vertices: Vector2[]): Matrix3 {
    let v1 = vertices[3].clone().sub(vertices[2]); // should be (1, 0)
    let v2 = vertices[1].clone().sub(vertices[2]); // should be (cos(pi - 2pi / n), sin(pi - 2pi / n))

    let d = vertices[2];

    let n = vertices.length;
    let theta = Math.PI * (1 - 2 / n);

    return new Matrix3().set(
        1, 0, -d.x,
        0, 1, -d.y,
        0, 0, 1,
    ).premultiply(
        new Matrix3().set(
            v1.x, v2.x, 0,
            v1.y, v2.y, 0,
            0, 0, 1,
        ).invert()
    ).premultiply(
        new Matrix3().set(
            1, Math.cos(theta), 0,
            0, Math.sin(theta), 0,
            0, 0, 1,
        )
    );
}
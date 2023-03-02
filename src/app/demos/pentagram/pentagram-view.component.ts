import {Component} from '@angular/core';
import {WindowPaneComponent} from "../../widgets/window-pane/window-pane.component";
import {Polygon2D, PolygonSpec} from "../../../graphics/shapes/polygon2D";
import {Complex} from "../../../math/complex";
import {Color} from "../../../graphics/shapes/color";
import {AffineGeodesic, AffinePoint} from "../../../math/geometry/geometry";
import {Path, PathSpec} from "../../../graphics/shapes/path";
import {Disk, DiskSpec} from "../../../graphics/shapes/disk";
import {OrthographicCamera} from "../../../graphics/camera/orthographic-camera";

@Component({
    selector: 'pentagram-view',
    templateUrl: '../../widgets/window-pane/window-pane.component.html',
    styleUrls: ['../../widgets/window-pane/window-pane.component.sass']
})
export class PentagramViewComponent extends WindowPaneComponent {
    private dirty = true;
    private innerVertices: Complex[] = [];
    private intermediateVertices: Complex[] = [];
    private outerVertices: Complex[] = [];

    override init() {
        this.camera = new OrthographicCamera();
        this.camera.setAspectRatio(this.canvas.width / this.canvas.height);
        const n = 5;
        for (let i = 0; i < n; i++) {
            this.innerVertices.push(Complex.polar(0.25, i * Math.PI * 2 / n));
        }
        this.setSelectables();
    }

    setSelectables() {
        const n = this.innerVertices.length;
        const ths = this;
        for (let i = 0; i < n; i++) {
            const v = this.innerVertices[i];
            const d = new Disk(this.gl, new DiskSpec(new Complex(), 0.05, Color.ZERO, undefined));
            d.recenter(v.x, v.y, 0);
            const s = {
                ...WindowPaneComponent.getSelectable(i + 1),
                drawable: d,
                mouseMove(x: number, y: number) {
                    const v4 = ths.viewportToWorld(x, y);
                    console.log(v4);
                    console.log(this.id, v4.x, v4.y);
                    ths.innerVertices[this.id - 1] = new Complex(v4.x, v4.y);
                    ths.intermediateVertices = [];
                    ths.outerVertices = [];
                    ths.dirty = true;
                    d.recenter(v4.x, v4.y, 0);
                }
            }
            this.addSelectable(`vertex-${i}`, s);
        }
    }


    override frame(dt: number) {
        if (this.dirty) {
            this.computePentagramMap();

            const n = this.innerVertices.length;
            const innerZigZag: Complex[] = [];
            const outerZigZag: Complex[] = [];
            for (let i = 0; i < n; i++) {
                innerZigZag.push(this.innerVertices[i]);
                innerZigZag.push(this.intermediateVertices[(i + n - 1) % n]);
                outerZigZag.push(this.intermediateVertices[i]);
                outerZigZag.push(this.outerVertices[(i + n - 1) % n]);
            }
            innerZigZag.push(this.innerVertices[0]);
            outerZigZag.push(this.intermediateVertices[0]);

            this.scene.clear();
            this.scene.set('inner', new Polygon2D(this.gl,
                new PolygonSpec(this.innerVertices, undefined, Color.scheme.primary),
                0.5));
            this.scene.set('innerZigZag', new Path(this.gl, new PathSpec(innerZigZag, Color.scheme.tertiary)));
            this.scene.set('intermediate', new Polygon2D(this.gl,
                new PolygonSpec(this.intermediateVertices, undefined, Color.scheme.secondary),
                0.5));
            this.scene.set('outerZigZag', new Path(this.gl, new PathSpec(outerZigZag, Color.scheme.tertiary)));
            this.scene.set('outer', new Polygon2D(this.gl,
                new PolygonSpec(this.outerVertices, undefined, Color.scheme.primary),
                0.5));
        }
    }

    iterate() {
        const n = this.innerVertices.length;
        let center = new Complex();
        for (let v of this.outerVertices) {
            center = center.plus(v.scale(1 / n));
        }
        let radius = 0;
        console.log(center.x, center.y);
        for (let v of this.outerVertices) {
            const d = v.distance(center) / n;
            console.log(d);
            radius += d;
        }
        this.innerVertices = this.outerVertices.map(v => v.scale(0.25 / radius));
        this.setSelectables();
        this.intermediateVertices = [];
        this.outerVertices = [];
        this.dirty = true;
    }

    private computePentagramMap() {
        let geodesics: AffineGeodesic[] = [];
        this.intermediateVertices = [];
        this.outerVertices = [];
        const n = this.innerVertices.length;
        for (let i = 0; i < n; i++) {
            const v1 = this.innerVertices[i];
            const v2 = this.innerVertices[(i + 1) % n];
            geodesics.push(new AffineGeodesic(new AffinePoint(v1), new AffinePoint(v2), true, true));
        }

        for (let i = 0; i < n; i++) {
            const g1 = geodesics[i];
            const g2 = geodesics[(i + 2) % n];
            const intersection = g1.intersect(g2);
            if (!intersection) throw Error('No intersection. Parallel sides?');
            this.intermediateVertices.push(intersection.resolve());
        }

        geodesics = [];
        for (let i = 0; i < n; i++) {
            const v1 = this.intermediateVertices[i];
            const v2 = this.intermediateVertices[(i + 1) % n];
            geodesics.push(new AffineGeodesic(new AffinePoint(v1), new AffinePoint(v2), true, true));
        }

        for (let i = 0; i < n; i++) {
            const g1 = geodesics[i];
            const g2 = geodesics[(i + 2) % n];
            const intersection = g1.intersect(g2);
            if (!intersection) throw Error('No intersection. Parallel sides?');
            this.outerVertices.push(intersection.resolve());
        }
    }

    override keyDown(e: KeyboardEvent) {
        super.keyDown(e);
        if (e.key === ' ' && !e.repeat) {
            this.iterate();
        }
    }
}

import {HyperbolicPolygon, HyperbolicPolygonSpec} from "../../graphics/shapes/hyperbolic-polygon";
import {Complex} from "../complex";
import {Color} from "../../graphics/shapes/color";
import {Scene} from "../../graphics/scene";
import {Path} from "../../graphics/shapes/path";
import {Mobius} from "../mobius";
import {HyperbolicGeodesic} from "./hyperbolic-geodesic";
import {normalizeAngle} from "../math-helpers";
import {Arc} from "../../graphics/shapes/arc";
import {Arc as ArcSegment} from "../geometry/arc";
import {Segment} from "../geometry/segment";
import {LineSegment} from "../geometry/line-segment";
import {Circle} from "../geometry/circle";
import {Selectable} from "../../app/demos/math-demo";
import {Disk, DiskSpec} from "../../graphics/shapes/disk";
import {ArcRegion} from "../geometry/arc-region";

export class HyperbolicOuterBilliards {
    private table!: HyperbolicPolygon;
    readonly vertices: Complex[] = [];
    readonly mobii: Mobius[] = [];
    private arcPreimages: Arc[] = [];
    private arcImages: Arc[] = [];
    private startRegions: ArcRegion[] = [];
    private imageRegions: ArcRegion[] = [];

    constructor(private readonly gl: WebGL2RenderingContext) {
        const n = 3;
        const r = 0.1;
        for (let i = 0; i < n; i++) {
            const v = Complex.polar(r, i * 2 * Math.PI / n + Math.PI / 2);
            this.vertices.push(v);
            this.mobii.push(Mobius.pointInversion(v));
        }
        this.updateTable();
    }

    private updateTable(): void {
        this.table = new HyperbolicPolygon(this.gl, new HyperbolicPolygonSpec(
            this.vertices,
            Color.CRIMSON,
            Color.ONYX,
        ));
        for (let i = 0; i < this.vertices.length; i++) {
            const v0 = this.vertices[(i - 1 + this.vertices.length) % this.vertices.length];
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.vertices.length];
            const g1 = new HyperbolicGeodesic(v0, v1);
            const g2 = new HyperbolicGeodesic(v1, v2);
            const c = g1.ideal2.plus(g2.ideal2).normalize();
            const segments = [
                g1.rightTail(),
                fromThreePoints(g1.ideal2, c, g2.ideal2),
                g2.rightTail(),
                g2.centralSegment(),
            ];

            const r = new ArcRegion(segments);
            this.startRegions.push(r);
            this.imageRegions.push(this.mapRegion(r))
        }
    }

    moveVertex(index: number, destination: Complex): void {
        this.vertices[index] = destination;
        this.mobii[index] = Mobius.pointInversion(destination);
        this.updateTable();
    }

    forwardMap(z: Complex): Mobius {
        for (let i = 0; i < this.startRegions.length; i++) {
            if (this.startRegions[i].containsPoint(z)) return this.mobii[i];
        }
        throw Error('No forward transformation');
    }

    inverseMap(z: Complex): Mobius {
        for (let i = 0; i < this.imageRegions.length; i++) {
            if (this.imageRegions[i].containsPoint(z)) return this.mobii[i];
        }
        throw Error('No inverse transformation');
    }

    mapRegion(r: ArcRegion): ArcRegion {
        const t = this.forwardMap(r.interiorPoint());
        const segments = [];
        for (let s of r.segments) {
            segments.push(fromThreePoints(t.apply(s.start), t.apply(s.mid), t.apply(s.end)));
        }
        return new ArcRegion(segments);
    }

    iteratePreimages(n: number): void {
        // this.arcImages = [];
        this.arcPreimages = [];
        // let currentImages: Segment[] = this.table.geodesics.map(g => g.leftTail());
        let currentPreimages: Segment[] = this.table.geodesics.map(g => g.rightTail());
        for (let i = 0; i < n; i++) {
            // this.arcImages.push(...(currentImages.map(s => Path.fromSegment(this.gl, s, Color.ONYX))));
            this.arcPreimages.push(...(currentPreimages.map(s => Path.fromSegment(this.gl, s, Color.ONYX))));

            // currentImages = currentImages.map(s => {
            //     const m = this.forwardMap(s.mid);
            //     return fromThreePoints(m.apply(s.start), m.apply(s.mid), m.apply(s.end));
            // });

            currentPreimages = currentPreimages.map(s => {
                const m = this.inverseMap(s.mid);
                return fromThreePoints(m.apply(s.start), m.apply(s.mid), m.apply(s.end));
            });
        }
    }

    populateScene(scene: Scene): void {
        scene.set('table', this.table);
        this.iteratePreimages(250);
        for (let i = 0; i < this.arcPreimages.length; i++) {
            // scene.set(`geodesic_image_${i + 1}`, this.arcImages[i]);
            scene.set(`geodesic_preimage_${i + 1}`, this.arcPreimages[i]);
        }
        for (let i = 0; i < this.imageRegions.length; i++) {
            // scene.set(`region_${i + 1}`,
            //     Polygon2D.fromArcRegion(this.gl, this.startRegions[i], Color.MANGO, Color.ONYX));
            // scene.set(`image_region_${i + 1}`,
            //     Polygon2D.fromArcRegion(this.gl, this.imageRegions[i], Color.TURQUOISE, Color.ONYX));
        }
    }
}

export class VertexHandle extends Selectable {
    constructor(private readonly gl: WebGL2RenderingContext,
                private readonly index: number,
                private readonly hob: HyperbolicOuterBilliards,
                private readonly scene: Scene,
                private readonly pixelToWorld: Function) {
        super(new Disk(gl, new DiskSpec(hob.vertices[index], 0.01, Color.RED, undefined)),
            (_x: number, _y: number) => {},
            (s: Selectable, x: number, y: number) => {
            const p = pixelToWorld(x, y);
            hob.moveVertex(index, p);
            hob.populateScene(scene);
            },
            (_x: number, _y: number) => {});
    }
}

function fromThreePoints(p1: Complex, p2: Complex, p3: Complex): Segment {
    if (p1.isInfinite() || p2.isInfinite() || p3.isInfinite()) throw Error('Infinite segment');
    if (p1.equals(p2) || p2.equals(p3) || p3.equals(p1)) throw Error('Degenerate segment');

    const d1 = p1.minus(p2);
    const d2 = p2.minus(p3);
    const det = d1.x * d2.y - d1.y * d2.y;

    if (det === 0) return new LineSegment(p1, p3);

    const c = Circle.fromThreePoints(p1, p2, p3);
    const a1 = c.center.heading(p1);
    const a2 = normalizeAngle(c.center.heading(p2), a1);
    const a3 = normalizeAngle(c.center.heading(p3), a1);

    let start: number;
    let end: number;
    if (a2 < a3) {
        start = a1;
        end = a3;
    } else {
        start = a3;
        end = a1;
    }
    return new ArcSegment(c.center, c.radius, start, normalizeAngle(end, start));
}

function angle(g1: HyperbolicGeodesic, g2: HyperbolicGeodesic): number {
    let h1 = 0;
    let h2 = 0;
    if (g1.p1.equals(g2.p1)) {
        h1 = g1.startHeading();
        h2 = g2.startHeading();
    } else if (g1.p1.equals(g2.p2)) {
        h1 = g1.startHeading();
        h2 = g2.endHeading();
    } else if (g1.p2.equals(g2.p1)) {
        h1 = g1.endHeading();
        h2 = g2.startHeading();
    } else if (g1.p2.equals(g2.p2)) {
        h1 = g1.endHeading();
        h2 = g2.endHeading();
    } else {
        throw Error('Geodesics do not line up');
    }
    return normalizeAngle(h2 - h1);
}
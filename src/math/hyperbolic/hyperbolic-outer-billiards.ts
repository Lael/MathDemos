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

export class HyperbolicOuterBilliards {
    private table!: HyperbolicPolygon;
    readonly vertices: Complex[] = [];
    readonly mobii: Mobius[] = [];
    private preimages: Arc[] = [];

    constructor(private readonly gl: WebGL2RenderingContext) {
        for (let v of [new Complex(-0.5, -0.5),
            new Complex(0.5, -0.5),
            new Complex(0.0, 0.5)]) {
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
        for (let v of this.vertices) {

        }
    }

    moveVertex(index: number, destination: Complex): void {
        this.vertices[index] = destination;
        this.mobii[index] = Mobius.pointInversion(destination);
        this.updateTable();
    }

    forwardMap(z: Complex): Mobius {
        let best = Math.PI;
        let m = undefined;
        const n = this.vertices.length;
        for (let i = 0; i < n; i++) {
            const v = this.vertices[i];
            const g1 = new HyperbolicGeodesic(z, v);
            const g2 = this.table.geodesics[i];
            const a = HyperbolicOuterBilliards.angle(g1, g2);
            if (a > 0.000_000_1 && a < best) {
                m = this.mobii[i];
                best = a;
            }
        }
        if (!m) throw Error('No forward transformation');
        return m;
    }

    inverseMap(z: Complex): Mobius {
        let best = Math.PI;
        let m = undefined;
        const n = this.vertices.length;
        for (let i = 0; i < n; i++) {
            const v = this.vertices[(i + 1) % n];
            const g1 = new HyperbolicGeodesic(z, v);
            const g2 = this.table.geodesics[i];
            const a = HyperbolicOuterBilliards.angle(g1, g2);
            if (a > 0.000_000_1 && a < best) {
                m = this.mobii[(i + 1) % n];
                best = a;
            }
        }
        if (!m) throw Error('No inverse transformation');
        return m;
    }

    private static angle(g1: HyperbolicGeodesic, g2: HyperbolicGeodesic): number {
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

    iteratePreimages(n: number): void {
        this.preimages = [];
        let current: Segment[] = this.table.geodesics.map(g => g.rightTail());
        for (let i = 0; i < n; i++) {
            this.preimages.push(...(current.map(s => Path.fromSegment(this.gl, s, Color.ONYX))));
            current = current.map(s => {
                const m = this.inverseMap(s.mid);
                return fromThreePoints(m.apply(s.start), m.apply(s.mid), m.apply(s.end));
            });
        }
    }

    populateScene(scene: Scene): void {
        scene.set('table', this.table);
        this.iteratePreimages(5);
        for (let i = 0; i < this.preimages.length; i++) {
            scene.set(`geodesic_${i + 1}`, this.preimages[i]);
        }
    }
}

function fromThreePoints(p1: Complex, p2: Complex, p3: Complex): Segment {
    console.log(p1, p2, p3);
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
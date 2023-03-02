import {affineCircleTangents, AffineGeodesic, AffinePoint, affinePointInvert, Circle} from "../geometry/geometry";
import {LineSegment} from "../geometry/line-segment";
import {BilliardsSettings, Duality, Flavor} from "./billiards";
import {Complex} from "../complex";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {HyperbolicModel} from "../hyperbolic/hyperbolic";
import {Drawable} from "../../graphics/shapes/drawable";
import {Polygon2D, PolygonSpec} from "../../graphics/shapes/polygon2D";
import {BilliardTable, fixTime} from "./tables";
import {Path} from "../../graphics/shapes/path";
import {Color} from "../../graphics/shapes/color";
import {MultiArc} from "../../graphics/shapes/multi-path";

export class AffinePolygonTable extends BilliardTable<AffinePoint, AffineGeodesic> {
    readonly vertices: AffinePoint[] = [];
    private readonly segments: LineSegment[] = [];
    private readonly n;
    private readonly geodesics: AffineGeodesic[] = [];
    private readonly preimageGeodesics: AffineGeodesic[] = [];

    constructor(settings: BilliardsSettings, gl: WebGL2RenderingContext) {
        super(settings);
        const n = settings.polygonDetails.vertexCount;
        this.n = n;
        const da = 2 * Math.PI / n;
        // if (n === 3) {
        //     this.vertices.push(new AffinePoint(new Complex(0.45, 0.45)));
        //     this.vertices.push(new AffinePoint(new Complex(1, 0)));
        //     this.vertices.push(new AffinePoint(new Complex(0, 1)));
        // } else if (n === 4) {
        //     this.vertices.push(new AffinePoint(new Complex(0.01, 0)));
        //     this.vertices.push(new AffinePoint(new Complex(0, 1)));
        //     this.vertices.push(new AffinePoint(new Complex(-0.01, 0)));
        //     this.vertices.push(new AffinePoint(new Complex(0, -1)));
        // } else {
        for (let i = 0; i < n; i++) {
            this.vertices.push(new AffinePoint(Complex.polar(1, i * da + Math.PI / 2)
                // .plus(Complex.polar(randFloat(0.1, 0.2), randFloat(0, Math.PI * 2)))
            ));
        }
        // }

        for (let i = 0; i < n; i++) {
            const v1 = this.vertices[i].resolve();
            const v2 = this.vertices[(i + 1) % n].resolve();
            const diff = v2.minus(v1);
            this.segments.push(new LineSegment(
                v1,
                v2,
            ));
            const ap1 = new AffinePoint(v2);
            const ap2 = new AffinePoint(v2.plus(diff));

            this.geodesics.push(new AffineGeodesic(
                ap1, ap2,
                true,
                false
            ));
            if (this.settings.duality == Duality.OUTER) {
                if (this.settings.flavor == Flavor.SYMPLECTIC) {
                    this.singularities.push(Path.fromSegment(gl, new AffineGeodesic(ap1, ap2, true, true).segment(), Color.MAGENTA));
                }
            }
        }
        if (this.settings.duality == Duality.OUTER && this.settings.flavor == Flavor.REGULAR) {
            let frontier = [
                ...this.preimageGeodesics,
            ];
            for (let i = 0; i < 100; i++) {
                const newFrontier: AffineGeodesic[] = [];
                for (let f of frontier) {
                    const scraps = f.split(this.geodesics);
                    try {
                        newFrontier.push(...scraps.map(g => this.outerPreimage(g)));
                    } catch (e) {

                    }
                }
                if (newFrontier.length === 0) break;
                this.preimageGeodesics.push(...newFrontier);
                frontier = newFrontier;
            }
            this.singularities.push(MultiArc.fromSegmentList(gl, this.preimageGeodesics.map(g => g.segment()), Color.MAGENTA));
        }
    }

    outerPreimage(g: AffineGeodesic): AffineGeodesic {
        const mid = g.segment().mid;
        const tp = this.leftTangentPoint(new AffinePoint(mid));
        return new AffineGeodesic(
            affinePointInvert(g.p1, tp),
            affinePointInvert(g.p2, tp),
            g.infForward,
            g.infReverse,
        );
    }

    intersect(time: number, heading: number): number {
        const t = fixTime(time);
        const p = this.point(t).resolve();
        const ls = new LineSegment(p, p.plus(Complex.polar(3, heading)));
        const candidates: Complex[] = [];
        for (let i = 0; i < this.n; i++) candidates.push(...this.segments[i].intersect(ls));
        for (let c of candidates) {
            const to = this.timeOf(c);
            const check = this.point(to).resolve();
            if (!closeEnough(c.distance(check), 0)) {
                console.log('(polygon) bad math');
            }
            if (!closeEnough(to, t)) {
                return to;
            }
        }
        throw Error('(polygon) no intersection');
    }

    rightInvertPoint(point: AffinePoint): AffinePoint {
        const p = point.resolve();
        const tp = this.rightTangentPoint(point).resolve();
        return new AffinePoint(p.plus(tp.minus(p).scale(2)));
    }

    leftInvertPoint(point: AffinePoint): AffinePoint {
        const p = point.resolve();
        const tp = this.leftTangentPoint(point).resolve();
        return new AffinePoint(p.plus(tp.minus(p).scale(2)));
    }

    point(time: number): AffinePoint {
        const t = fixTime(time);
        const nt = this.n * t
        const i = Math.floor(nt);
        const f = nt % 1;

        const v1 = this.vertices[i];
        const v2 = this.vertices[(i + 1) % this.n];

        return new AffinePoint(Complex.lerp(v1.resolve(), v2.resolve(), f));
    }

    rightTangentGeodesic(object: Circle<AffinePoint> | AffinePoint): AffineGeodesic {
        if (object instanceof AffinePoint) {
            try {
                return new AffineGeodesic(object, this.rightTangentPoint(object), true, true);
            } catch (e) {
                for (let i = 0; i < this.n; i++) {
                    const v1 = this.vertices[i];
                    const v2 = this.vertices[(i + 1) % this.n];
                    const g = new AffineGeodesic(object, v1, true, true)
                    if (g.contains(v2)) return g;
                }
                throw e;
            }
        }
        const candidates: AffineGeodesic[] = [];
        for (let v of this.vertices) {
            const d = v.distance(object.center);
            if (d < object.radius || closeEnough(d, object.radius)) continue;
            const tgs = affineCircleTangents(object, v);
            // Figure out which one is the right one
            for (let tg of tgs) {
                const h = object.center.heading(tg.p1);
                if (normalizeAngle(tg.p1.heading(tg.p2), h) - h < Math.PI) candidates.push(tg);
            }
        }
        let best = candidates[0];
        let bestHeading = best.p1.heading(best.p2);
        for (let i = 1; i < candidates.length; i++) {
            const c = candidates[i];
            const h = normalizeAngle(c.p1.heading(c.p2), bestHeading) - bestHeading;
            if (h > Math.PI) {
                best = c;
                bestHeading = best.p1.heading(best.p2);
            }
        }
        return best;
    }

    leftTangentGeodesic(object: Circle<AffinePoint> | AffinePoint): AffineGeodesic {
        if (object instanceof AffinePoint) {
            try {
                return new AffineGeodesic(object, this.leftTangentPoint(object), true, true);
            } catch (e) {
                for (let i = 0; i < this.n; i++) {
                    const v1 = this.vertices[i];
                    const v2 = this.vertices[(i + 1) % this.n];
                    const g = new AffineGeodesic(v1, object, true, true)
                    if (g.contains(v2)) return g;
                }
                throw e;
            }
        }
        const candidates: AffineGeodesic[] = [];
        for (let v of this.vertices) {
            const tgs = affineCircleTangents(object, v);
            // Figure out which one is the left one
            for (let tg of tgs) {
                const h = object.center.heading(tg.p1);
                if (normalizeAngle(tg.p1.heading(tg.p2), h) - h > Math.PI) candidates.push(tg);
            }
        }
        let best = candidates[0];
        let bestHeading = best.p1.heading(best.p2);
        for (let i = 1; i < candidates.length; i++) {
            const c = candidates[i];
            const h = normalizeAngle(c.p1.heading(c.p2), bestHeading) - bestHeading;
            if (h < Math.PI) {
                best = c;
                bestHeading = best.p1.heading(best.p2);
            }
        }
        return best;
    }

    rightTangentPoint(object: Circle<AffinePoint> | AffinePoint): AffinePoint {
        if (object instanceof Circle) throw Error('NYI');
        for (let i = 0; i < this.n; i++) {
            const v0 = this.vertices[i];
            const v1 = this.vertices[(i + 1) % this.n];
            const v2 = this.vertices[(i + 2) % this.n];
            const h10 = v1.heading(v0);
            const h = normalizeAngle(v1.heading(object), h10);
            const h12 = normalizeAngle(v2.heading(v1), h10);
            if (h > h10 && h < h12) {
                return v1;
            }
        }
        throw Error('Singular point');
    }

    leftTangentPoint(object: Circle<AffinePoint> | AffinePoint): AffinePoint {
        if (object instanceof Circle) throw Error('NYI');
        for (let i = 0; i < this.n; i++) {
            const v0 = this.vertices[i];
            const v1 = this.vertices[(i + 1) % this.n];
            const v2 = this.vertices[(i + 2) % this.n];
            const h01 = v0.heading(v1);
            const h = normalizeAngle(v1.heading(object), h01);
            const h12 = normalizeAngle(v1.heading(v2), h01);
            if (h > h01 && h < h12) {
                return v1;
            }
        }
        throw Error('Singular point');
    }

    tangentHeading(time: number): number | undefined {
        const t = fixTime(time);
        const nt = this.n * t
        const i = Math.floor(nt);
        if (i === nt) return undefined;

        const v1 = this.vertices[i];
        const v2 = this.vertices[(i + 1) % this.n];

        return v1.heading(v2);
    }

    toDrawable(gl: WebGL2RenderingContext, model: HyperbolicModel | undefined): Drawable {
        const fillColor = this.settings.duality === Duality.INNER ? undefined : BilliardTable.TABLE_FILL;
        return new Polygon2D(gl, new PolygonSpec(this.vertices.map(v => v.resolve(model)), fillColor, BilliardTable.TABLE_BORDER, BilliardTable.TABLE_BORDER_THICKNESS), 0.1);
    }

    private timeOf(q: Complex): number {
        for (let i = 0; i < this.n; i++) {
            const s = this.segments[i];
            if (!s.containsPoint(q)) continue;
            const l = s.length;
            const f = q.distance(s.start) / l;
            return (i + f) / this.n;
        }
        throw Error('(polygon) timeOf: point not on polygon')
    }

    flatIntervals(): number[][] {
        const intervals = [];
        for (let i = 0; i < this.n; i++) {
            intervals.push([i / this.n, (i + 1) / this.n]);
        }
        return intervals;
    }

    preimages(): AffineGeodesic[] {
        return this.preimageGeodesics;
    }
}
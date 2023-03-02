import {AffineGeodesic, AffinePoint, Circle} from "../geometry/geometry";
import {ArcSegment} from "../geometry/arc-segment";
import {LineSegment} from "../geometry/line-segment";
import {BilliardsSettings, Duality} from "./billiards";
import {Complex} from "../complex";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {HyperbolicModel} from "../hyperbolic/hyperbolic";
import {Drawable} from "../../graphics/shapes/drawable";
import {Stadium, StadiumSpec} from "../../graphics/shapes/stadium";
import {BilliardTable, fixTime} from "./tables";
import {AffineCircle} from "../geometry/affine-circle";

export class StadiumTable extends BilliardTable<AffinePoint, AffineGeodesic> {
    length: number;
    radius: number;

    private ra: ArcSegment;
    private tl: LineSegment;
    private la: ArcSegment;
    private bl: LineSegment;

    constructor(settings: BilliardsSettings) {
        super(settings);
        this.length = settings.stadiumDetails.length;
        this.radius = settings.stadiumDetails.radius;
        this.ra = new ArcSegment(new Complex(this.length / 2, 0),
            this.radius,
            -Math.PI / 2,
            Math.PI / 2);
        this.tl = new LineSegment(new Complex(this.length / 2, this.radius),
            new Complex(-this.length / 2, this.radius));
        this.la = new ArcSegment(new Complex(-this.length / 2, 0),
            this.radius,
            Math.PI / 2,
            3 * Math.PI / 2);
        this.bl = new LineSegment(new Complex(-this.length / 2, -this.radius),
            new Complex(this.length / 2, -this.radius));
    }

    intersect(time: number, heading: number): number {
        const t = fixTime(time);
        const p = this.point(t).resolve();
        const ls = new LineSegment(p, p.plus(Complex.polar(this.length + 2 * this.radius + 1, heading)));
        const candidates: Complex[] = [];
        candidates.push(...this.ra.intersect(ls));
        candidates.push(...this.tl.intersect(ls));
        candidates.push(...this.la.intersect(ls));
        candidates.push(...this.bl.intersect(ls));
        for (let c of candidates) {
            const to = this.timeOf(c);
            const check = this.point(to).resolve();
            if (!closeEnough(c.distance(check), 0)) {
                console.log('Bad math!', c.distance(check));
            }
            if (!closeEnough(to, t)) return to;
        }
        throw Error('No intersection!');
    }

    private tangentPoints(object: Circle<AffinePoint> | AffinePoint): AffinePoint[] {
        if (object instanceof Circle) throw Error('NYI');
        const p = object.resolve();
        if (Math.abs(p.imag) === this.radius) throw Error('Singular point');
        const cpl = new Complex(p.x + this.length / 2, p.y);
        const cpr = new Complex(p.x - this.length / 2, p.y);
        const r2 = this.radius * this.radius;
        const circleL = new AffineCircle(cpl, Math.sqrt(cpl.modulusSquared() - r2));
        const circleR = new AffineCircle(cpl, Math.sqrt(cpl.modulusSquared() - r2));
        const unitCircle = new AffineCircle(new Complex(), this.radius);
        const intersections = circleL.intersectCircle(unitCircle);
        intersections.push(...circleR.intersectCircle(unitCircle));
        return intersections.map(i =>
            new AffinePoint(
                new Complex(
                    i.x + Math.sign(i.x) * this.length / 2,
                    i.y,
                )));
    }

    rightTangentPoint(object: Circle<AffinePoint> | AffinePoint): AffinePoint {
        if (object instanceof Circle) throw Error('NYI');
        const tps = this.tangentPoints(object);
        if (tps.length === 0) throw Error('No intersections');
        const h0 = object.heading(new AffinePoint(new Complex()));
        let best = tps[0];
        let bestH = normalizeAngle(object.heading(best), h0);
        for (let tp of tps) {
            const h = normalizeAngle(object.heading(tp), h0);
            if (h < bestH) {
                bestH = h;
                best = tp;
            }
        }
        return best;
    }

    leftTangentPoint(object: Circle<AffinePoint> | AffinePoint): AffinePoint {
        if (object instanceof Circle) throw Error('NYI');
        const tps = this.tangentPoints(object);
        if (tps.length === 0) throw Error('No intersections');
        const h0 = object.heading(new AffinePoint(new Complex()));
        let best = tps[0];
        let bestH = normalizeAngle(object.heading(best), h0);
        for (let tp of tps) {
            const h = normalizeAngle(object.heading(tp), h0);
            if (h > bestH) {
                bestH = h;
                best = tp;
            }
        }
        return best;
    }

    rightInvertPoint(point: AffinePoint): AffinePoint {
        const p = point.resolve();
        const tp = this.rightTangentPoint(point);
        return new AffinePoint(p.plus(tp.resolve().minus(p).scale(2)));
    }

    leftInvertPoint(point: AffinePoint): AffinePoint {
        const p = point.resolve();
        const tp = this.leftTangentPoint(point);
        return new AffinePoint(p.plus(tp.resolve().minus(p).scale(2)));
    }

    point(time: number): AffinePoint {
        const t = fixTime(time);

        if (t < 0.25) {
            // Right cap
            // 0 should go to -π/2, 0.25 should go to π / 2
            const theta = 4 * Math.PI * t - Math.PI / 2;
            return new AffinePoint(new Complex(
                this.radius * Math.cos(theta) + this.length / 2,
                this.radius * Math.sin(theta)
            ));
        } else if (t < 0.5) {
            // Top edge
            return new AffinePoint(new Complex(this.length / 2 - (4 * (t - 0.25) * this.length), this.radius));
        } else if (t < 0.75) {
            // Left cap
            // 0.5 should go to π/2, 0.75 should go to 3π / 2
            const theta = 4 * Math.PI * (t - 0.5) + Math.PI / 2;
            return new AffinePoint(new Complex(
                this.radius * Math.cos(theta) - this.length / 2,
                this.radius * Math.sin(theta)
            ));
        } else {
            // Bottom edge
            return new AffinePoint(new Complex((4 * (t - 0.75) * this.length) - this.length / 2, -this.radius));
        }
    }

    rightTangentGeodesic(object: Circle<AffinePoint> | AffinePoint): AffineGeodesic {
        throw new Error('NYI');
    }

    leftTangentGeodesic(object: Circle<AffinePoint> | AffinePoint): AffineGeodesic {
        throw new Error('NYI');
    }

    tangentHeading(time: number): number | undefined {
        const t = fixTime(time);

        if (t < 0.25) {
            // Right cap
            // 0 to 0, 0.25 to π
            return 4 * Math.PI * t;
        } else if (t < 0.5) {
            // Top edge
            return Math.PI;
        } else if (t < 0.75) {
            // Left cap
            // 0.5 to π, 0.75 to 2π
            return 4 * Math.PI * (t - 0.5) + Math.PI;
        } else {
            // Bottom edge
            return 0;
        }
    }

    toDrawable(gl: WebGL2RenderingContext, _: HyperbolicModel | undefined): Drawable {
        const fillColor = this.settings.duality === Duality.INNER ? undefined : BilliardTable.TABLE_FILL;
        return new Stadium(gl,
            new StadiumSpec(new Complex(), this.length, this.radius, undefined, BilliardTable.TABLE_BORDER, BilliardTable.TABLE_BORDER_THICKNESS),
            0.1);
    }

    private timeOf(q: Complex) {
        if (closeEnough(q.imag, this.radius) && Math.abs(q.real) < this.length / 2) {
            // Top
            // qr = l/2 -> 0.25, -l/2 -> 1
            return (this.length / 2 - q.real) / (4 * this.length) + 0.25;
        } else if (closeEnough(q.imag, -this.radius) && Math.abs(q.real) < this.length / 2) {
            // Bottom
            // qr = -l/2 -> 0.75, l/2 -> 1
            return (q.real / this.length + 0.5) / 4 + 0.75;
        } else if (q.real > 0) {
            // Right
            const rawAngle = Math.atan2(q.imag, q.real - this.length / 2); // in range (-π, π]
            // -π/2 should go to 0, π/2 should go to 0.25
            return (rawAngle + Math.PI / 2) / (4 * Math.PI);
        } else {
            // Left
            const rawAngle = normalizeAngle(Math.atan2(q.imag, q.real + this.length / 2), 0); // in range (-π, π]
            // π/2 should go to 0.5, 3π/2 should go to 0.75
            return (rawAngle - Math.PI / 2) / (4 * Math.PI) + 0.5;
        }
    }

    flatIntervals(): number[][] {
        return [[0.25, 0.5], [0.75, 1]];
    }

    preimages(): AffineGeodesic[] {
        return [];
    }
}
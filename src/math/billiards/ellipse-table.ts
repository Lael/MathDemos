import {AffineGeodesic, AffinePoint, Circle} from "../geometry/geometry";
import {BilliardsSettings, Duality} from "./billiards";
import {normalizeAngle, solveQuadratic} from "../math-helpers";
import {Complex} from "../complex";
import {HyperbolicModel} from "../hyperbolic/hyperbolic";
import {Drawable} from "../../graphics/shapes/drawable";
import {Disk, DiskSpec} from "../../graphics/shapes/disk";
import {BilliardTable} from "./tables";
import {AffineCircle} from "../geometry/affine-circle";

export class EllipseTable extends BilliardTable<AffinePoint, AffineGeodesic> {

    private readonly eccentricity: number;
    private readonly semiMajor: number;
    private readonly semiMinor: number;
    private readonly smsi: number;

    constructor(settings: BilliardsSettings) {
        super(settings);
        this.eccentricity = settings.ellipseDetails.eccentricity;
        if (this.eccentricity < 0 || this.eccentricity >= 1) throw new Error('Ellipse eccentricity must be in [0, 1)');
        this.semiMajor = 1;
        const semiMinorSquared = 1 - Math.pow(this.eccentricity, 2)
        this.semiMinor = Math.sqrt(semiMinorSquared);
        this.smsi = 1 / semiMinorSquared;
    }

    intersect(time: number, heading: number): number {
        // p + t h
        // x^2 + 1/sms y^2 = 1
        // (px + t hx)^2 + smsi(py + t hy)^2 = 1
        // px2 + 2thx px + t2 hx2 + smsi(py2 + 2t hy py + t2 hy2) = 1
        // t2(hx2 + hy2 smsi) + t(2hx px + 2hypy smsi) + (px2 + smsi py2 - 1) = 0
        const p = this.point(time).resolve();
        const px = p.real;
        const py = p.imag;

        const hx = Math.cos(heading);
        const hy = Math.sin(heading);

        const a = hx * hx + hy * hy * this.smsi;
        const b = 2 * (hx * px + hy * py * this.smsi);
        const c = px * px + py * py * this.smsi - 1;
        const ts = solveQuadratic(new Complex(a, 0), new Complex(b, 0), new Complex(c, 0));
        const t = (Math.abs(ts[0].real) > Math.abs(ts[1].real)) ? ts[0].real : ts[1].real;
        const q = p.plus(Complex.polar(t, heading));
        const qv = this.point(this.timeOf(q)).resolve();
        if (qv.distance(q) > 0.00001) {
            console.log('Help');
        }
        return this.timeOf(q);
    }

    rightInvertPoint(point: AffinePoint): AffinePoint {
        const p = point.resolve();
        const tp = this.rightTangentPoint(point);
        return new AffinePoint(
            p.plus(tp.resolve().minus(p).scale(2))
        );
    }

    leftInvertPoint(point: AffinePoint): AffinePoint {
        const p = point.resolve();
        const tp = this.leftTangentPoint(point);
        return new AffinePoint(
            p.plus(tp.resolve().minus(p).scale(2))
        );
    }

    private tangentPoints(object: Circle<AffinePoint> | AffinePoint): AffinePoint[] {
        if (object instanceof Circle) throw Error('NYI');
        const p = object.resolve();
        const cp = new Complex(p.x / this.semiMajor, p.y / this.semiMinor);
        const circle = new AffineCircle(cp, Math.sqrt(cp.modulusSquared() - 1));
        const intersections = circle.intersectCircle(new AffineCircle(new Complex(), 1));
        return intersections.map(i =>
            new AffinePoint(
                new Complex(
                    i.x * this.semiMajor,
                    i.y * this.semiMinor,
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

    point(time: number): AffinePoint {
        const tpt = 2 * Math.PI * time;
        const x = this.semiMajor * Math.cos(tpt);
        const y = this.semiMinor * Math.sin(tpt);
        return new AffinePoint(new Complex(x, y));

    }

    rightTangentGeodesic(object: Circle<AffinePoint> | AffinePoint): AffineGeodesic {
        if (object instanceof AffinePoint) {
            return new AffineGeodesic(this.rightTangentPoint(object), object, true, true);
        }
        // https://graemewilkin.github.io/Geometry/Construct_Tangent_to_Ellipse.html
        throw Error('NYI');
    }

    leftTangentGeodesic(object: Circle<AffinePoint> | AffinePoint): AffineGeodesic {
        if (object instanceof AffinePoint) {
            return new AffineGeodesic(this.rightTangentPoint(object), object, true, true);
        }
        // https://graemewilkin.github.io/Geometry/Construct_Tangent_to_Ellipse.html
        throw Error('NYI');
    }

    tangentHeading(time: number): number | undefined {
        const tpt = 2 * Math.PI * time;
        const ddx = -this.semiMajor * Math.sin(tpt);
        const ddy = this.semiMinor * Math.cos(tpt);
        return Math.atan2(ddy, ddx);
    }

    toDrawable(gl: WebGL2RenderingContext, _: HyperbolicModel | undefined): Drawable {
        const fillColor = this.settings.duality === Duality.INNER ? undefined : BilliardTable.TABLE_FILL;
        const disk = new Disk(gl,
            new DiskSpec(
                new Complex(),
                1,
                fillColor,
                BilliardTable.TABLE_BORDER,
                BilliardTable.TABLE_BORDER_THICKNESS),
            0.1);
        disk.scaleXYZ(this.semiMajor, this.semiMinor, 1);
        return disk;
    }

    private timeOf(q: Complex) {
        return normalizeAngle(Math.atan2(q.imag / this.semiMinor, q.real), 0) / (2 * Math.PI);
    }

    flatIntervals(): number[][] {
        return [];
    }


    preimages(): AffineGeodesic[] {
        return [];
    }
}
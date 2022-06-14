import {Complex} from "../complex";
import {Mobius} from "../mobius";
import {Line} from "../geometry/line";
import {Circle} from "../geometry/circle";
import {Segment} from "../geometry/segment";
import {fromThreePoints} from "../geometry/geometry-helpers";
import {LineSegment} from "../geometry/line-segment";
import {closeEnough, normalizeAngle} from "../math-helpers";

//new Mobius(new Complex(0, 1), new Complex(-1, 0), new Complex(1, 0), new Complex(0, -1));
const POINCARE_TO_HALF_PLANE = Mobius.mapThree(
    new Complex(0, -1), new Complex(0, 0), new Complex(0, 1),
    new Complex(0, 0), new Complex(0, 1), Complex.INFINITY);

export enum HyperbolicModel {
    POINCARE = 0,
    KLEIN = 1,
    HALF_PLANE = 2,
}

function validatePoincare(p: Complex): void {
    const m = p.modulusSquared();
    if (m > 1 && !closeEnough(m, 1)) {
        throw new Error(`${p} is not a valid point in the Poincaré model: its norm squared is ${m}`);
    }
}

function validateKlein(p: Complex): void {
    const m = p.modulusSquared();
    if (m > 1 && !closeEnough(m, 1)) {
        throw new Error(`${p} is not a valid point in the Klein model: its norm squared is ${m}`);
    }
}

function validateHalfPlane(p: Complex): void {
    if (p.imag < 0 && !closeEnough(p.imag, 0) && !p.isInfinite()) {
        throw new Error(`${p} is not a valid point in the half-plane model: its imaginary component is ${p.imag}`);
    }
}

export function poincareToKlein(p: Complex): Complex {
    validatePoincare(p);
    return p.scale(2 / (1 + p.modulusSquared()));
}

export function kleinToPoincare(p: Complex): Complex {
    validateKlein(p);
    return p.scale(1 / (1 + Math.sqrt(Math.max(1 - p.modulusSquared(), 0))));
}

export function poincareToHalfPlane(p: Complex): Complex {
    validatePoincare(p);
    return POINCARE_TO_HALF_PLANE.apply(p);
}

export function halfPlaneToPoincare(p: Complex): Complex {
    validateHalfPlane(p);
    return POINCARE_TO_HALF_PLANE.inverse().apply(p);
}

export function kleinToHalfPlane(p: Complex): Complex {
    return poincareToHalfPlane(kleinToPoincare(p));
}

export function halfPlaneToKlein(p: Complex): Complex {
    validateHalfPlane(p);
    return poincareToKlein(halfPlaneToPoincare(p));
}

export class HyperPoint {
    readonly poincare: Complex;
    readonly klein: Complex;
    readonly halfPlane: Complex;

    constructor(p: Complex, model: HyperbolicModel) {
        switch (model) {
            case HyperbolicModel.POINCARE:
                validatePoincare(p);
                this.poincare = p;
                this.klein = poincareToKlein(p);
                this.halfPlane = poincareToHalfPlane(p);
                break;
            case HyperbolicModel.KLEIN:
                validateKlein(p);
                this.poincare = kleinToPoincare(p);
                this.klein = p;
                this.halfPlane = kleinToHalfPlane(p);
                break;
            case HyperbolicModel.HALF_PLANE:
                validateHalfPlane(p);
                this.poincare = halfPlaneToPoincare(p);
                this.klein = halfPlaneToKlein(p);
                this.halfPlane = p;
                break;
            default:
                throw new Error('Unknown hyperbolic model');
        }
    }

    resolve(model: HyperbolicModel): Complex {
        switch (model) {
            case HyperbolicModel.POINCARE:
                return this.poincare;
            case HyperbolicModel.KLEIN:
                return this.klein;
            case HyperbolicModel.HALF_PLANE:
                return this.halfPlane;
            default:
                throw new Error('Unknown hyperbolic model');
        }
    }

    static fromPoincare(p: Complex): HyperPoint {
        return new HyperPoint(p, HyperbolicModel.POINCARE);
    }

    static fromKlein(p: Complex): HyperPoint {
        return new HyperPoint(p, HyperbolicModel.KLEIN);
    }

    static fromHalfPlane(p: Complex): HyperPoint {
        return new HyperPoint(p, HyperbolicModel.HALF_PLANE);
    }

    equals(other: HyperPoint): boolean {
        return this.poincare.equals(other.poincare) || this.klein.equals(other.klein);
    }

    isIdeal() {
        return closeEnough(this.klein.modulusSquared(), 1);
    }
}

export class HyperGeodesic {
    readonly p: HyperPoint;
    readonly q: HyperPoint;
    readonly ip: HyperPoint;
    readonly iq: HyperPoint;

    readonly mid: HyperPoint;

    constructor(p: HyperPoint, q: HyperPoint) {
        if (p.equals(q)) throw new Error('Trivial geodesic');
        this.p = p;
        this.q = q;
        // This part is easiest is the Klein model, since geodesics are straight lines there.
        const kl = Line.throughTwoPoints(p.klein, q.klein);
        const ideals = new Circle(new Complex(), 1).intersectLine(kl);
        if (ideals.length != 2) throw new Error('Unexpected number of intersections');
        const dp = ideals[0].distance(p.klein);
        const dq = ideals[0].distance(q.klein);
        if (dp < dq) {
            this.ip = HyperPoint.fromKlein(ideals[0]);
            this.iq = HyperPoint.fromKlein(ideals[1]);
        } else {
            this.ip = HyperPoint.fromKlein(ideals[1]);
            this.iq = HyperPoint.fromKlein(ideals[0]);
        }

        this.mid = HyperPoint.fromKlein(p.klein.plus(q.klein).scale(0.5));
    }

    get start() { return this.p }
    get end() { return this.q }

    segment(model: HyperbolicModel): Segment {
        if (model === HyperbolicModel.KLEIN) {
            return new LineSegment(this.p.klein, this.q.klein);
        }
        return fromThreePoints(
            this.p.resolve(model),
            this.mid.resolve(model),
            this.q.resolve(model),
        );
    }

    interpolate(model: HyperbolicModel, start: HyperPoint, includeLast: boolean = true): Complex[] {
        const s = this.segment(model);
        let points = s.interpolate(1);
        if (!includeLast) points.pop();
        if (!points[0].equals(start.resolve(model))) points = points.reverse();
        return points;
    }

    get pTail() {
        return new HyperGeodesic(this.ip, this.p);
    }

    get qTail() {
        return new HyperGeodesic(this.q, this.iq);
    }

    intersect(other: HyperGeodesic): HyperPoint|undefined {
        const l1 = new LineSegment(this.p.klein, this.q.klein);
        const l2 = new LineSegment(other.p.klein, other.q.klein);
        const c = l1.intersect(l2);
        if (c.length === 0) return undefined;
        return HyperPoint.fromKlein(c[0]);
    }

    split(splitPoints: HyperPoint[]): HyperGeodesic[] {
        const ls = new LineSegment(this.p.klein, this.q.klein);
        const segments = ls.split(splitPoints.map(p => p.klein));
        return segments.map(segment =>
            new HyperGeodesic(HyperPoint.fromKlein(segment.start), HyperPoint.fromKlein(segment.end)));
    }

    wind(p: HyperPoint): number {
        return normalizeAngle(p.klein.heading(this.q.klein) - p.klein.heading(this.p.klein));
    }

    containsPoint(p: HyperPoint): boolean {
        return this.segment(HyperbolicModel.KLEIN).containsPoint(p.klein);
    }
}

export class HyperIsometry {
    static IDENTITY = new HyperIsometry(Mobius.IDENTITY);

    private constructor(private readonly poincareMobius: Mobius) {}

    static pointInversion(point: HyperPoint): HyperIsometry {
        return new HyperIsometry(Mobius.pointInversion(point.poincare));
    }

    apply(point: HyperPoint): HyperPoint {
        const poincarePoint = this.poincareMobius.apply(point.poincare);
        if (closeEnough(point.poincare.modulusSquared(), 0)) poincarePoint.normalize();
        return HyperPoint.fromPoincare(poincarePoint);
    }

    compose(inner: HyperIsometry): HyperIsometry {
        return new HyperIsometry(this.poincareMobius.compose(inner.poincareMobius));
    }

    fixedPoints(): HyperPoint[] {
        return this.poincareMobius.fixedPoints().filter(p => {
            const m = p.modulusSquared();
            return closeEnough(m, 1) || m < 1
        }).map(p => HyperPoint.fromPoincare(p));
    }

    rotation(): number {
        if (this.equals(HyperIsometry.IDENTITY)) return 0;
        const f = this.fixedPoints().find(p => !p.isIdeal());
        if (!f) throw new Error('Isometry has no interior fixed points');
        const one = HyperPoint.fromPoincare(new Complex(1, 0));
        const h1 = f.poincare.heading(one.poincare);
        const h2 = f.poincare.heading(this.apply(one).poincare);
        return normalizeAngle(h2, h1) - h1;
    }

    equals(other: HyperIsometry): boolean {
        return this.poincareMobius.equals(other.poincareMobius);
    }
}
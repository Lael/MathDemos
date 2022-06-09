import {Complex} from "../complex";
import {Mobius} from "../mobius";
import {Line} from "../geometry/line";
import {Circle} from "../geometry/circle";

//new Mobius(new Complex(0, 1), new Complex(-1, 0), new Complex(1, 0), new Complex(0, -1));
const POINCARE_TO_HALFPLANE = Mobius.mapThree(
    new Complex(0, -1), new Complex(0, 0), new Complex(0, 1),
    new Complex(0, 0), new Complex(0, 1), Complex.INFINITY);

export enum HyperbolicModel {
    POINCARE = 0,
    KLEIN = 1,
    HALF_PLANE = 2,
}

function validatePoincare(p: Complex): void {
    if (p.modulusSquared() > 1) {
        throw new Error(`${p} is not a valid point in the Poincaré model`);
    }
}

function validateKlein(p: Complex): void {
    if (p.modulusSquared() > 1) {
        throw new Error(`${p} is not a valid point in the Klein model`);
    }
}

function validateHalfPlane(p: Complex): void {
    if (p.imag >= 0 || p.isInfinite()) {
        throw new Error(`${p} is not a valid point in the half-plane model`);
    }
}

function poincareToKlein(p: Complex): Complex {
    validatePoincare(p);
    return p.scale(2 / (1 + p.modulusSquared()));
}

function kleinToPoincare(p: Complex): Complex {
    validateKlein(p);
    return p.scale(1 / (1 + Math.sqrt(1 - p.modulusSquared())));
}

function poincareToHalfPlane(p: Complex): Complex {
    validatePoincare(p);
    return POINCARE_TO_HALFPLANE.apply(p);
}

function halfPlaneToPoincare(p: Complex): Complex {
    validateHalfPlane(p);
    return POINCARE_TO_HALFPLANE.inverse().apply(p);
}

function kleinToHalfPlane(p: Complex): Complex {
    return poincareToHalfPlane(kleinToPoincare(p));
}

function halfPlaneToKlein(p: Complex): Complex {
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
        return this.poincare.equals(other.poincare);
    }
}

export class HyperGeodesic {
    readonly p: HyperPoint;
    readonly q: HyperPoint;
    readonly ip: HyperPoint;
    readonly iq: HyperPoint;

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
    }
}
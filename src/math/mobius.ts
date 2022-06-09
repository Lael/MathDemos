import {Transformation} from "./transformation";
import {Complex} from "./complex";
import {HyperbolicGeodesic} from "./hyperbolic/hyperbolic-geodesic";
import {solveQuadratic} from "./math-helpers";

export class Mobius extends Transformation {
    static readonly IDENTITY = new Mobius(new Complex(1, 0), new Complex(), new Complex(), new Complex(1, 0));

    constructor(
        private readonly a: Complex,
        private readonly b: Complex,
        private readonly c: Complex,
        private readonly d: Complex) {
        super();
        const det = a.times(d).minus(b.times(c));
        if (det.isZero()) throw Error('Degenerate Möbius transformation');
        if (a.isInfinite() || b.isInfinite() || c.isInfinite() || d.isInfinite())
            throw Error('Möbius transformation with infinite coefficient');
    }

    override apply(z: Complex): Complex {
        const n = this.a.times(z).plus(this.b);
        const d = this.c.times(z).plus(this.d);
        return n.over(d);
    }

    inverse(): Mobius {
        return new Mobius(this.d, this.b.scale(-1), this.c.scale(-1), this.a);
    }

    compose(inner: Mobius) {
        return new Mobius(
            this.a.times(inner.a).plus(this.b.times(inner.c)),
            this.a.times(inner.b).plus(this.b.times(inner.d)),
            this.c.times(inner.a).plus(this.d.times(inner.c)),
            this.c.times(inner.b).plus(this.d.times(inner.d)),
        )
    }

    fixedPoints(): Complex[] {
        if (this.c.isZero()) return [this.b.over(this.d.minus(this.a))];
        return solveQuadratic(this.c, this.d.minus(this.a), this.b.scale(-1));
    }

    static to01Inf(z1: Complex, z2: Complex, z3: Complex): Mobius {
        if (z1.equals(z2) || z2.equals(z3) || z3.equals(z1)) throw Error('Degenerate Möbius transformation');
        if (z1.isInfinite()) {
            return new Mobius(
                new Complex(),
                z3.minus(z2),
                new Complex(-1, 0),
                z3
            );
        }
        if (z2.isInfinite()) {
            return new Mobius(
                new Complex(1, 0),
                z1.scale(-1),
                new Complex(1, 0),
                z3.scale(-1)
            );
        }
        if (z3.isInfinite()) {
            return new Mobius(
                new Complex(-1, 0),
                z1,
                new Complex(),
                z1.minus(z2)
            );
        }
        const aa = z2.minus(z3);
        const bb = z1.scale(-1).times(aa);
        const cc = z2.minus(z1);
        const dd = z3.scale(-1).times(cc);

        return new Mobius(aa, bb, cc, dd);
    }


    static mapThree(z1: Complex, z2: Complex, z3: Complex,
                    w1: Complex, w2: Complex, w3: Complex): Mobius {
        return Mobius.to01Inf(w1, w2, w3).inverse().compose(Mobius.to01Inf(z1, z2, z3));
    }

    static pointInversion(p: Complex): Mobius {
        if (p.modulusSquared() >= 1) throw Error('Non-interior point inversion');
        if (p.isZero()) return new Mobius(new Complex(-1), new Complex(), new Complex(), new Complex(1));
        const g = new HyperbolicGeodesic(new Complex(), p);
        return this.mapThree(
            p, g.ideal1, g.ideal2,
            p, g.ideal2, g.ideal1
        );
    }

    override toString(): string {
        return `[(${this.a})z + (${this.b})] / [${this.c}z + (${this.d})]`;
    }
}
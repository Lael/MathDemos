export class Complex {

    static readonly INFINITY = new Complex(Infinity, Infinity);
    static readonly I = new Complex(0, 1);

    constructor(readonly real: number = 0, readonly imag: number = 0) {
        if (isNaN(real) || isNaN(imag)) {
            throw new Error("Cannot pass NaN to complex.");
        }
    }

    static polar(radius: number, angle: number): Complex {
        if (radius < 0) throw Error('Radius cannot be negative');
        if (!isFinite(radius)) return Complex.INFINITY;
        if (!isFinite(angle)) throw Error('Angle cannot be infinite');
        return new Complex(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
        );
    }

    get x(): number {
        return this.real;
    }

    get y(): number {
        return this.imag;
    }

    isInfinite(): boolean {
        return !this.isFinite();
    }

    isFinite(): boolean {
        return isFinite(this.real) && isFinite(this.imag);
    }

    isZero(): boolean {
        return this.real === 0 && this.imag === 0;
    }

    modulus(): number {
        if (this.isInfinite()) return Infinity;
        return Math.sqrt(this.real * this.real + this.imag * this.imag);
    }

    modulusSquared(): number {
        if (this.isInfinite()) return Infinity;
        return this.real * this.real + this.imag * this.imag;
    }

    normalize(l: number = 1): Complex {
        if (this.isZero()) throw Error('Cannot normalize 0');
        return new Complex(this.real, this.imag).scale(l / this.modulus())
    }

    argument(): number {
        if (this.isInfinite()) throw Error('Infinity has no argument');
        if (this.isZero()) throw Error('Zero has no argument');
        return Math.atan2(this.imag, this.real);
    }

    conjugate(): Complex {
        return new Complex(this.real, -this.imag);
    }

    plus(other: Complex): Complex {
        if (this.isInfinite() && other.isInfinite()) throw Error('Undefined complex operation: inf + inf');
        if (this.isInfinite() || other.isInfinite()) return Complex.INFINITY;
        return new Complex(this.real + other.real, this.imag + other.imag);
    }

    minus(other: Complex): Complex {
        return this.plus(other.scale(-1));
    }

    scale(d: number): Complex {
        return new Complex(this.real * d, this.imag * d);
    }

    times(other: Complex): Complex {
        if (this.isInfinite() && other.isZero()) {
            throw Error("Indeterminate form: inf * 0");
        }
        if (this.isZero() && other.isInfinite()) {
            throw Error("Indeterminate form: 0 * inf");
        }
        if (this.isInfinite() || other.isInfinite()) {
            return Complex.INFINITY;
        }
        return new Complex(
            this.real * other.real - this.imag * other.imag,
            this.real * other.imag + this.imag * other.real);
    }

    over(other: Complex): Complex {
        if (this.isInfinite() && other.isInfinite()) {
            throw Error("Indeterminate form: inf / inf");
        }
        if (this.isZero() && other.isZero()) {
            throw Error("Indeterminate form: 0 / 0");
        }
        if (other.isZero()) return Complex.INFINITY;
        if (other.isInfinite()) return new Complex();
        return this.times(other.conjugate()).scale(1 / other.modulusSquared());
    }

    distance(other: Complex): number {
        return this.minus(other).modulus();
    }

    heading(p: Complex) {
        return p.minus(this).argument();
    }

    toString(): string {
        if (this.isInfinite()) return 'inf';
        if (this.isZero()) return '0';
        if (this.real === 0) return `${Complex.decimal(this.imag)}i`
        if (this.imag === 0) return `${Complex.decimal(this.real)}`
        if (this.imag < 0) return `${Complex.decimal(this.real)} - ${Complex.decimal(Math.abs(this.imag))}i`
        return `${Complex.decimal(this.real)} + ${Complex.decimal(this.imag)}i`
    }

    private static decimal(v: number, places: number = 3): number {
        const t = Math.pow(10, places);
        return Math.round(v * t) / t;
    }

    equals(other: Complex): boolean {
        if (this.isInfinite()) return other.isInfinite();
        return this.distance(other) < 0.000_000_1;
    }
}
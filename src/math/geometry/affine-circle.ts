import {Complex} from "../complex";
import {Line} from "./line";
import {closeEnough} from "../math-helpers";

export class AffineCircle {
    constructor(readonly center: Complex, readonly radius: number) {
        if (center.isInfinite() || !isFinite(radius)) throw Error('Circle with infinite parameter');
        if (radius <= 0) throw Error('Circle with non-positive radius');
    }

    static fromThreePoints(p1: Complex, p2: Complex, p3: Complex): AffineCircle {
        const center = Line.bisector(p1, p2).intersectLine(Line.bisector(p2, p3));
        const radius = center.distance(p2);
        return new AffineCircle(center, radius);
    }

    intersectCircle(other: AffineCircle): Complex[] {
        const v = other.center.minus(this.center);
        const d = v.modulus();
        if (closeEnough(d, 0)) {
            // if (this.radius === other.radius) throw Error('Trivial circle-circle intersection');
            return [];
        }
        if (d > this.radius + other.radius || d < Math.abs(this.radius - other.radius)) return [];
        if (d === this.radius + other.radius) return [this.center.plus(v.normalize(this.radius))];
        const x = (d * d - other.radius * other.radius + this.radius * this.radius) / (2 * d);
        const y = Math.sqrt(this.radius * this.radius - x * x);
        // if (isNaN(y)) console.log(this.radius, other.radius, d, x);
        const c = this.center.plus(v.normalize(x));
        const perp = v.times(Complex.I).normalize(y);
        return [c.plus(perp), c.minus(perp)];
    }

    intersectLine(line: Line): Complex[] {
        const cc = line.c + (line.a * this.center.x + line.b * this.center.y);
        return intersectHelper(line.a, line.b, cc, this.radius).map(c => c.plus(this.center));
    }

    containsPoint(p: Complex): boolean {
        return this.center.distance(p) < this.radius;
    }
}

function intersectHelper(a: number, b: number, c: number, r: number): Complex[] {
    if (a === 0) {
        const d = -c / b;
        if (Math.abs(d) > r) return [];
        if (Math.abs(d) === r) return [new Complex(0, d)];
        const s = Math.sqrt(r * r - d * d);
        return [new Complex(s, d), new Complex(-s, d)];
    }
    if (b === 0) {
        const d = -c / a;
        if (Math.abs(d) > r) return [];
        if (Math.abs(d) === r) return [new Complex(0, d)];
        const s = Math.sqrt(r * r - d * d);
        return [new Complex(d, s), new Complex(d, -s)];
    }
    const x = -c * a / (a * a + b * b);
    const y = b / a * x;
    const p = new Complex(x, y);
    const d = p.modulus();
    if (d > r) return [];
    if (d === r) return [p];
    const diff = new Complex(-b, a).normalize(Math.sqrt(r * r - d * d));
    return [p.minus(diff), p.plus(diff)];
}
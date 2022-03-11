import {Complex} from "../complex";
import {Line} from "./line";

export class Circle {
    constructor(readonly center: Complex, readonly radius: number) {
        if (center.isInfinite() || !isFinite(radius)) throw Error('Circle with infinite parameter');
        if (radius <= 0) throw Error('Circle with non-positive radius');
    }

    static fromThreePoints(p1: Complex, p2: Complex, p3: Complex): Circle {
        const center = Line.bisector(p1, p2).intersectLine(Line.bisector(p2, p3));
        const radius = center.distance(p2);
        return new Circle(center, radius);
    }

    intersectCircle(other: Circle): Complex[] {
        const v = other.center.minus(this.center);
        const d = v.modulus();
        if (v.isZero()) {
            if (this.radius === other.radius) throw Error('Trivial circle-circle intersection');
            return [];
        }
        if (d > this.radius + other.radius || d < Math.abs(this.radius - other.radius)) return [];
        if (d === this.radius + other.radius) return [this.center.plus(v.normalize(this.radius))];
        const x = (d * d - other.radius * other.radius + this.radius * this.radius) / (2 * d);
        const y = Math.sqrt(this.radius * this.radius - x * x);
        const c = this.center.plus(v.normalize(x));
        const perp = v.times(Complex.I).normalize(y);
        return [c.plus(perp), c.minus(perp)];
    }

    intersectLine(line: Line): Complex[] {
        const cc = line.c - (line.a * this.center.x + line.b * this.center.y);
        const r = this.radius;
        if (line.a === 0) {
            const d = -cc/line.b;
            if (Math.abs(d) > r) return [];
            if (Math.abs(d) === r) return [new Complex(0, d)];
            const s = Math.sqrt(r * r - d * d);
            return [new Complex(s, d), new Complex(-s, d)];
        }
        if (line.b === 0) {
            const d = -cc/line.a;
            if (Math.abs(d) > r) return [];
            if (Math.abs(d) === r) return [new Complex(0, d)];
            const s = Math.sqrt(r * r - d * d);
            return [new Complex(d, s), new Complex(d, -s)];
        }
        const x = -line.c * line.a / (line.a * line.a + line.b * line.b);
        const y = (-line.c - line.a * x) / line.b;
        const d = Math.sqrt(x * x + y * y);
        if (Math.abs(d) > r) return [];
        const p = new Complex(x, y);
        if (Math.abs(d) === r) return [p];
        const diff = new Complex(-line.b, line.a).normalize(Math.sqrt(r * r - d * d));
        return [p.minus(diff), p.minus(diff)];
    }

    containsPoint(p: Complex): boolean {
        return this.center.distance(p) < this.radius;
    }
}
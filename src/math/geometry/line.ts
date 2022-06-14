import {Complex} from "../complex";
import {closeEnough} from "../math-helpers";

export class Line {
    readonly a: number;
    readonly b: number;
    readonly c: number;

    constructor(a: number,
                b: number,
                c: number) {
        if (!(isFinite(a) && isFinite(b) && isFinite(c))) throw Error('Line with non-finite coefficients');
        const l = new Complex(a, b).modulus();
        if (l === 0) throw Error('Degenerate line');
        this.a = a / l;
        this.b = b / l;
        this.c = c / l;
    }

    static srcDir(src: Complex, dir: Complex): Line {
        if (dir.isZero()) throw new Error('Degenerate line');
        const m = dir.times(Complex.I);
        return new Line(
            m.x,
            m.y,
            -(m.x * src.x + m.y * src.y)
        );
    }

    static throughTwoPoints(c1: Complex, c2: Complex): Line {
        return Line.srcDir(c1, c2.minus(c1));
    }

    static bisector(p1: Complex, p2: Complex): Line {
        const dir = p2.minus(p1).times(Complex.I);
        return Line.srcDir(p1.plus(p2).scale(0.5), dir);
    }

    intersectLine(other: Line): Complex {
        const d = this.a * other.b - this.b * other.a;
        if (closeEnough(d, 0)) throw Error('Parallel lines do not intersect');
        const solution = new Complex(
            -other.b * this.c + this.b * other.c,
             other.a * this.c - this.a * other.c,
        ).scale(1 / d);
        if (!this.containsPoint(solution) || !other.containsPoint(solution)) {
            debugger;
            throw Error('Bad intersection');
        }
        return solution;
    }

    containsPoint(p: Complex): boolean {
        return closeEnough(this.a * p.x + this.b * p.y + this.c, 0);
    }
}
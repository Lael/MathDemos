import {Segment} from "./segment";
import {Complex} from "../complex";
import {Circle} from "./circle";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {LineSegment} from "./line-segment";

export class ArcSegment extends Segment {
    readonly circle: Circle;
    readonly startAngle: number;
    readonly endAngle: number;
    constructor(readonly center: Complex, readonly radius: number, a1: number, a2: number) {
        super();
        if (a1 >= a2) {
            const t = a2;
            a2 = a1;
            a1 = t;
        }
        if (a2 - a1 > Math.PI * 2) throw Error('Arc too long');
        this.startAngle = normalizeAngle(a1);
        this.endAngle = normalizeAngle(a2, this.startAngle);
        this.circle = new Circle(center, radius);
    }

    override get start() {
        return this.center.plus(Complex.polar(this.radius, this.startAngle));
    }

    override get mid() {
        return this.center.plus(Complex.polar(this.radius, 0.5 * (this.startAngle + this.endAngle)));
    }

    override get end() {
        return this.center.plus(Complex.polar(this.radius, this.endAngle));
    }

    override intersect(other: Segment): Complex[] {
        if (other instanceof LineSegment) return other.intersect(this);
        if (other instanceof ArcSegment) return this.intersectArc(other);
        throw Error('Unknown segment type');
    }

    private intersectArc(other: ArcSegment): Complex[] {
        const candidates = this.circle.intersectCircle(other.circle);
        return candidates.filter(candidate => this.containsPoint(candidate) && other.containsPoint(candidate));
    }

    override containsPoint(p: Complex): boolean {
        // const theta = normalizeAngle(this.center.heading(p), this.startAngle);
        // const aMatch = theta <= this.endAngle;
        // const rMatch = closeEnough(this.center.distance(p), this.radius);
        // return aMatch && rMatch;
        return (normalizeAngle(this.center.heading(p), this.startAngle) <= this.endAngle) && closeEnough(this.center.distance(p), this.radius);
    }

    override startHeading(): number {
        return normalizeAngle(this.startAngle + Math.PI / 2);
    }

    override endHeading(): number {
        return normalizeAngle(this.endAngle - Math.PI / 2);
    }

    override startCurvature(): number {
        return 1 / this.radius;
    }

    override endCurvature(): number {
        return -1 / this.radius;
    }

    override wind(p: Complex): number {
        if (this.containsPoint(p)) throw Error('Undefined winding number');
        const a1 = p.heading(this.start);
        const a2 = p.heading(this.end);
        const w = normalizeAngle(a2 - a1);
        if (this.circle.containsPoint(p) && w < 0) {
            return Math.PI - w;
        }
        return w;
    }

    override split(points: Complex[]): Segment[] {
        const headings: number[] = [];
        headings.push(this.startAngle);
        headings.push(this.endAngle);
        for (let p of points) {
            headings.push(normalizeAngle(this.center.heading(p), this.startAngle));
        }
        headings.sort();

        const pieces = [];
        for (let i = 0; i < headings.length - 1; i++) {
            const a = headings[i];
            const b = headings[i + 1];
            if (a === b) continue;
            pieces.push(new ArcSegment(this.center, this.radius, a, b));
        }
        return pieces;
    }

    override interpolate(direction: number): Complex[] {
        const pts: Complex[] = [];
        const segments = Math.round(Math.abs(this.endAngle - this.startAngle) * 180 / Math.PI) + 1;
        for (let i = 0; i < segments; i++) {
            const theta = this.startAngle + i * (this.endAngle - this.startAngle) / segments;
            pts.push(this.center.plus(Complex.polar(this.radius, theta)));
        }
        pts.push(this.end);
        return direction > 0 ? pts : pts.reverse();
    }
}
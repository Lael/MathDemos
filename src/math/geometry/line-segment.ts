import {Segment} from "./segment";
import {Complex} from "../complex";
import {Line} from "./line";
import {Arc} from "./arc";
import {closeEnough, normalizeAngle} from "../math-helpers";

export class LineSegment extends Segment {
    private readonly m;
    readonly line: Line;
    readonly length: number;
    constructor(private readonly p1: Complex, private readonly p2: Complex) {
        super();
        if (p1.isInfinite() || p2.isInfinite()) throw Error('Infinite line segment');
        if (p1.equals(p2)) throw Error('Degenerate line segment');
        this.m = p1.plus(p2).scale(0.5);
        this.line = Line.throughTwoPoints(p1, p2);
        this.length = p1.minus(p2).modulus();
    }

    override get start() {
        return this.p1;
    }

    override get mid() {
        return this.m;
    }

    override get end() {
        return this.p2;
    }

    override intersect(other: Segment): Complex[] {
        if (other instanceof LineSegment) return this.intersectLineSegment(other);
        if (other instanceof Arc) return this.intersectArc(other);
        throw Error('Unknown segment type');
    }

    private intersectLineSegment(other: LineSegment): Complex[] {
        const candidate = this.line.intersectLine(other.line);
        if (this.containsPoint(candidate) && other.containsPoint(candidate)) return [candidate];
        return [];
    }

    private intersectArc(other: Arc): Complex[] {
        const candidates = other.circle.intersectLine(this.line);
        return candidates.filter(candidate => this.containsPoint(candidate) && other.containsPoint(candidate));
    }

    override containsPoint(p: Complex): boolean {
        return closeEnough(this.p1.distance(p) + this.p2.distance(p), length);
    }

    override startHeading(): number {
        return this.p1.heading(this.p2);
    }

    override endHeading(): number {
        return this.p2.heading(this.p1);
    }

    override startCurvature(): number {
        return 0;
    }

    override endCurvature(): number {
        return 0;
    }

    override wind(p: Complex): number {
        if (this.containsPoint(p)) throw Error('Undefined winding number');
        return normalizeAngle(p.heading(this.p2) - p.heading(this.p1));
    }

    override split(points: Complex[]): Segment[] {
        const pts: Complex[] = [];
        pts.push(this.p1);
        pts.push(this.p2);
        pts.push(...points);
        pts.sort((a, b) => {
            if (a.distance(this.p1) == b.distance(this.p1)) return 0;
            return a.distance(this.p1) > b.distance(this.p1) ? 1 : -1;
        });

        const pieces = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            pieces.push(new LineSegment(a, b));
        }
        return pieces;
    }

    override interpolate(direction: number, segments: number): Complex[] {
        return direction > 0 ? [this.p1, this.p2] : [this.p2, this.p1];
    }
}
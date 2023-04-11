import {Vector2} from "three";
import {Flavor} from "./new-billiard";
import {LineSegment} from "../geometry/line-segment";
import {Complex} from "../complex";
import {fixTime} from "./tables";
import {Line} from "../geometry/line";
import {closeEnough, normalizeAngle} from "../math-helpers";

const SYMPLECTIC_PREIMAGE_PIECES = 400;
const SYMPLECTIC_PREIMAGE_LENGTH = 10;

export type AffineInnerState = {
    time: number;
    angle: number;
}

export type AffineChord = {
    startTime: number;
    startAngle: number;
    endTime: number;
    endAngle: number;

    p1: Vector2;
    p2: Vector2;
}

export class AffineRay {
    line: Line;

    constructor(readonly start: Vector2,
                readonly end: Vector2,
                readonly infinite: boolean) {
        this.line = Line.throughTwoPoints(Complex.fromVector2(start), Complex.fromVector2(end));
    }

    intersect(other: AffineRay): Vector2 | null {
        let intersection: Vector2;
        try {
            intersection = this.line.intersectLine(other.line).toVector2();
        } catch (e) {
            return null;
        }
        const valid = this.containsPoint(intersection) && other.containsPoint(intersection);
        return valid ? intersection : null;
    }

    containsPoint(point: Vector2): boolean {
        if (!this.line.containsPoint(Complex.fromVector2(point))) return false;
        const d1 = point.distanceTo(this.start);
        const d2 = point.distanceTo(this.end);
        // Between start and end
        if (closeEnough(d1 + d2, this.start.distanceTo(this.end))) return true;
        return this.infinite && d1 > d2;
    }
}

class AffineCircle {
    private readonly radiusSquared: number;

    constructor(readonly center: Vector2, readonly radius: number) {
        this.radiusSquared = radius * radius;
    }

    pointOnBoundary(point: Vector2) {
        return closeEnough(point.distanceToSquared(this.center), this.radiusSquared);
    }

    containsPoint(point: Vector2) {
        return point.distanceToSquared(this.center) < this.radiusSquared ||
            this.pointOnBoundary(point);
    }

    tangentPoint(point: Vector2, clockwise: boolean = false): Vector2 {
        if (this.pointOnBoundary(point)) return point;
        if (this.containsPoint(point)) throw Error('Cannot make tangent to point inside circle');
        const mid = point.clone().add(this.center).multiplyScalar(0.5);
        const l = mid.distanceTo(this.center);
        const d2 = this.radiusSquared / (2 * l);
        const diff = mid.clone().sub(this.center).normalize();
        const lc = this.center.clone().add(diff.clone().multiplyScalar(d2));
        const h = Math.sqrt(this.radiusSquared - d2 * d2);
        if (clockwise) return lc.clone().add(new Vector2(-diff.y * h, diff.x * h));
        else return lc.clone().add(new Vector2(diff.y * h, -diff.x * h));
    }

    tangentLine(point: Vector2, clockwise: boolean = false): Line {
        if (this.pointOnBoundary(point)) {
            return Line.throughTwoPoints(this.center, point).perpAtPoint(point);
        }
        const tp = this.tangentPoint(point, clockwise);
        return Line.throughTwoPoints(tp, point);
    }

}

export class NewAffinePolygonTable {
    readonly n: number;
    readonly sides: LineSegment[] = [];
    readonly slicingRays: AffineRay[] = [];

    constructor(readonly vertices: Vector2[]) {
        this.n = vertices.length;
        for (let i = 0; i < this.n; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % this.n];
            const ls = new LineSegment(Complex.fromVector2(v1), Complex.fromVector2(v2))
            this.sides.push(ls);
            this.slicingRays.push(
                new AffineRay(
                    v2,
                    v2.clone().add(v2.clone().sub(v1).normalize()),
                    true)
            );
        }
    }

    private point(time: number): Vector2 {
        const t = fixTime(time);
        const nt = this.n * t
        const i = Math.floor(nt);
        const f = nt % 1;

        const v1 = Complex.fromVector2(this.vertices[i]);
        const v2 = Complex.fromVector2(this.vertices[(i + 1) % this.n]);

        return Complex.lerp(v1, v2, f).toVector2();
    }

    private angle(startTime: number, endTime: number): number {
        const p1 = Complex.fromVector2(this.point(startTime));
        const p2 = Complex.fromVector2(this.point(endTime));
        const heading = this.heading(startTime);
        return normalizeAngle(p1.heading(p2) - heading, 0) % Math.PI;
    }

    private timeOf(point: Vector2): number {
        const z = Complex.fromVector2(point);
        for (let [i, segment] of this.sides.entries()) {
            if (!segment.containsPoint(z)) continue;
            const l = segment.length;
            const f = z.distance(segment.start) / l;
            return (i + f) / this.n;
        }
        throw Error('Point not on polygon');
    }

    private heading(time: number): number {
        const t = fixTime(time);
        const nt = this.n * t
        const i = Math.floor(nt);

        const v1 = this.vertices[i];
        const v2 = this.vertices[(i + 1) % this.n];

        return Complex.fromVector2(v1).heading(Complex.fromVector2(v2));
    }

    private intersect(state: AffineInnerState): AffineInnerState {
        const t = fixTime(state.time);
        if (closeEnough(state.angle % Math.PI, 0)) return state;
        if (state.angle < 0 || state.angle > Math.PI) throw Error('Invalid angle');
        const z = Complex.fromVector2(this.point(t));
        const theta = this.heading(t);
        const line = Line.throughTwoPoints(z, z.plus(Complex.polar(1, state.angle + theta)));
        for (let segment of this.sides) {
            let intersection;
            try {
                intersection = segment.line.intersectLine(line);
            } catch (e) {
                continue;
            }
            if (intersection.equals(z)) continue;
            if (segment.containsPoint(intersection)) {
                const time = this.timeOf(intersection.toVector2());
                const angle = normalizeAngle(intersection.heading(z) - this.heading(time), 0);
                return {time, angle};
            }
        }
        throw Error('No intersection');
    }

    iterateInner(state: AffineInnerState,
                 flavor: Flavor,
                 iterations: number = 1): AffineChord[] {
        let chord;
        try {
            chord = this.innerStateToChord(state);
        } catch (e) {
            return [];
        }
        const chords = [chord];
        for (let i = 0; i < iterations; i++) {
            let newChord: AffineChord;
            switch (flavor) {
                case Flavor.REGULAR:
                    try {
                        newChord = this.innerRegular(chord);
                    } catch (e) {
                        return chords;
                    }
                    break;
                case Flavor.SYMPLECTIC:
                    try {
                        newChord = this.innerSymplectic(chord);
                    } catch (e) {
                        return chords;
                    }
                    break;
                default:
                    throw Error('Unknown flavor');
            }
            if (closeEnough(newChord.startTime, state.time) && closeEnough(newChord.startAngle, state.angle)) break;
            chords.push(newChord);
            chord = newChord;
        }
        return chords;
    }

    private innerRegular(chord: AffineChord): AffineChord {
        const regularIntersection = this.intersect({
            time: chord.endTime,
            angle: Math.PI - chord.endAngle,
        });
        return {
            startTime: chord.endTime,
            startAngle: Math.PI - chord.endAngle,
            endTime: regularIntersection.time,
            endAngle: regularIntersection.angle,
            p1: chord.p2,
            p2: this.point(regularIntersection.time),
        };
    }

    private innerSymplectic(chord: AffineChord): AffineChord {
        const symplecticIntersection = this.intersect({
            time: chord.startTime,
            angle: normalizeAngle(this.heading(chord.endTime) - this.heading(chord.startTime), 0) % Math.PI,
        });
        return {
            startTime: chord.endTime,
            startAngle: this.angle(chord.endTime, symplecticIntersection.time),
            endTime: symplecticIntersection.time,
            endAngle: this.angle(symplecticIntersection.time, chord.endTime),
            p1: chord.p2,
            p2: this.point(symplecticIntersection.time),
        };
    }

    private innerStateToChord(state: AffineInnerState): AffineChord {
        const p1 = this.point(state.time);
        const intersection = this.intersect(state);
        const p2 = this.point(intersection.time);
        return {
            startTime: state.time,
            startAngle: state.angle,
            endTime: intersection.time,
            endAngle: intersection.angle,
            p1, p2
        };
    }

    iterateOuter(startingPoint: Vector2,
                 flavor: Flavor,
                 iterations: number = 1): Vector2[] {
        const points = [startingPoint];
        let point = startingPoint;
        for (let i = 0; i < iterations; i++) {
            let newPoint: Vector2;
            switch (flavor) {
                case Flavor.REGULAR:
                    try {
                        newPoint = this.outerRegular(point);
                    } catch (e) {
                        return points;
                    }
                    break;
                case Flavor.SYMPLECTIC:
                    try {
                        newPoint = this.outerSymplectic(point);
                    } catch (e) {
                        return points;
                    }
                    break;
                default:
                    throw Error('Unknown billiard flavor');
            }
            points.push(newPoint);
            point = newPoint;
            if (closeEnough(newPoint.distanceTo(startingPoint), 0)) break;
        }
        return points;
    }

    private outerRegular(point: Vector2): Vector2 {
        const pivot = this.forwardVertex(point);
        return this.reflectRegular(pivot, point);
    }

    private reflectRegular(pivot: Vector2, point: Vector2) {
        const diff = pivot.clone().sub(point);
        return point.clone().add(diff.multiplyScalar(2));
    }

    private forwardVertex(point: Vector2): Vector2 {
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const v3 = this.vertices[(i + 2) % this.n];
            const s2 = v2.clone().sub(v1);
            const s3 = v3.clone().sub(v2);
            const d1 = point.clone().sub(v1);
            const d2 = point.clone().sub(v2);
            if (s2.cross(d1) <= 0 && s3.cross(d2) >= 0) return v2;
        }
        throw Error('Point is not in domain of forward map');
    }

    private reverseVertex(point: Vector2): Vector2 {
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const v3 = this.vertices[(i + 2) % this.n];
            const s2 = v2.clone().sub(v1);
            const s3 = v3.clone().sub(v2);
            const d2 = point.clone().sub(v2);
            const d3 = point.clone().sub(v3);
            if (s2.cross(d2) >= 0 && s3.cross(d3) <= 0) return v2;
        }
        throw Error('Point is not in domain of backward map');
    }

    private outerSymplectic(point: Vector2, reverse: boolean = false): Vector2 {
        const circle = this.symplecticOuterCircle(point, reverse);
        const forward = reverse ? this.reverseVertex(point) : this.forwardVertex(point);
        const fl = Line.throughTwoPoints(point, forward);
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const v3 = this.vertices[(i + 2) % this.n];
            if (circle.pointOnBoundary(v2)) continue;
            if (reverse) {
                const tp = circle.tangentPoint(v2, true);
                const dir = v2.clone().sub(tp);
                const c1 = v1.clone().sub(tp);
                const c3 = v3.clone().sub(tp);
                if (dir.cross(c1) < 0 && dir.cross(c3) < 0) {
                    const tl = Line.throughTwoPoints(tp, v2);
                    return tl.intersectLine(fl).toVector2();
                }
            } else {
                const tp = circle.tangentPoint(v2, false);
                const dir = v2.clone().sub(tp);
                const c1 = v1.clone().sub(tp);
                const c3 = v3.clone().sub(tp);
                if (dir.cross(c1) > 0 && dir.cross(c3) > 0) {
                    const tl = Line.throughTwoPoints(tp, v2);
                    return tl.intersectLine(fl).toVector2();
                }
            }
        }
        throw Error('Could not find next point');
    }

    private symplecticOuterCircle(point: Vector2, reverse: boolean): AffineCircle {
        const t1 = reverse ? this.reverseVertex(point) : this.forwardVertex(point);
        const t2 = reverse ? this.forwardVertex(point) : this.reverseVertex(point);
        const d = t1.distanceTo(point);
        const m = point.clone().add(point.clone().sub(t2).normalize().multiplyScalar(d));
        const lf = Line.throughTwoPoints(point, t1);
        const lb = Line.throughTwoPoints(point, t2);
        const pf = lf.perpAtPoint(t1);
        const pb = lb.perpAtPoint(m);
        const cc = pf.intersectLine(pb).toVector2();
        const radius = cc.distanceTo(t1);
        return new AffineCircle(cc, radius);
    }

    preimages(flavor: Flavor, iterations: number): AffineRay[] {
        switch (flavor) {
            case Flavor.REGULAR:
                return this.regularPreimages(iterations);
            case Flavor.SYMPLECTIC:
                return this.symplecticPreimages(iterations);
            default:
                throw Error('Unknown flavor');
        }
    }

    private regularPreimages(iterations: number) {
        const preimages: AffineRay[] = [];
        let frontier: AffineRay[] = [];
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const diff = v1.clone().sub(v2).normalize();
            frontier.push(new AffineRay(v1, v1.clone().add(diff), true));
        }
        for (let i = 0; i < iterations; i++) {
            preimages.push(...frontier);
            const newFrontier: AffineRay[] = [];
            for (let preimage of frontier) {
                const pieces = this.slicePreimage(preimage);
                for (let piece of pieces) {
                    let mid: Vector2;
                    if (piece.infinite) {
                        mid = piece.end;
                        // If far away and pointing away, skip
                        if (piece.start.lengthSq() > 10_000 &&
                            piece.end.clone().sub(piece.start).dot(piece.start) > 0) continue;
                    } else {
                        mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
                        // If far away, skip
                        if (mid.lengthSq() > 10_000) continue;
                        // If tiny, skip
                        if (piece.start.distanceToSquared(piece.end) < 0.000_000_01) continue;
                    }
                    let pivot: Vector2;
                    try {
                        pivot = this.reverseVertex(mid);
                    } catch (e) {
                        continue;
                    }
                    newFrontier.push(
                        new AffineRay(
                            this.reflectRegular(pivot, piece.start),
                            this.reflectRegular(pivot, piece.end),
                            piece.infinite)
                    );
                }
            }
            frontier = newFrontier;
        }
        return preimages;
    }

    private slicePreimage(preimage: AffineRay, buffer: boolean = false): AffineRay[] {
        const intersections = [];
        for (let slicingRay of this.slicingRays) {
            const intersection = slicingRay.intersect(preimage);
            if (intersection === null) continue;
            if (closeEnough(intersection.distanceTo(preimage.start), 0) && !buffer) continue;
            if (!preimage.infinite && closeEnough(intersection.distanceTo(preimage.end), 0) && !buffer) continue;
            intersections.push(intersection);
        }

        if (intersections.length === 0) return [preimage];
        let bufferDiff = new Vector2();
        if (buffer) {
            bufferDiff = preimage.end.clone().sub(preimage.start).normalize().multiplyScalar(0.000_000_001);
        }

        const pieces = [];
        intersections.sort((a, b) => a.distanceToSquared(preimage.start) - b.distanceToSquared(preimage.start));
        if (!closeEnough(preimage.start.distanceTo(intersections[0]), 0)) {
            pieces.push(new AffineRay(preimage.start, intersections[0].clone().sub(bufferDiff), false));
        }
        for (let i = 0; i < intersections.length - 1; i++) {
            try {
                pieces.push(new AffineRay(
                    intersections[i].clone().add(bufferDiff),
                    intersections[i + 1].clone().sub(bufferDiff), false));
            } catch (e) {
            }
        }
        const lastIntersection = intersections[intersections.length - 1];
        const end = lastIntersection.clone().add(preimage.end.clone().sub(preimage.start).normalize());
        try {
            if (preimage.infinite) pieces.push(new AffineRay(lastIntersection, end, true));
            else if (!closeEnough(preimage.start.distanceTo(intersections[0]), 0)) {
                pieces.push(new AffineRay(lastIntersection.clone().add(bufferDiff), preimage.end, false));
            }
        } catch (e) {
        }

        return pieces;
    }

    private symplecticPreimages(iterations: number): AffineRay[] {
        const preimages: AffineRay[] = [];
        let frontier: AffineRay[] = [];
        for (let i = 0; i < this.n; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.n];
            const diff = v1.clone().sub(v2).normalize();
            const dl = SYMPLECTIC_PREIMAGE_LENGTH / SYMPLECTIC_PREIMAGE_PIECES;
            for (let j = 1; j < SYMPLECTIC_PREIMAGE_PIECES; j++) {
                frontier.push(new AffineRay(
                    v1.clone().add(diff.clone().multiplyScalar(j * dl)),
                    v1.clone().add(diff.clone().multiplyScalar((j + 1) * dl)),
                    false));
            }
        }
        for (let i = 0; i < iterations; i++) {
            preimages.push(...frontier);
            const newFrontier: AffineRay[] = [];
            for (let segment of frontier) {
                let pieces: AffineRay[];
                try {
                    pieces = this.slicePreimage(segment, true);
                } catch (e) {
                    continue;
                }
                for (let piece of pieces) {
                    try {
                        const mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
                        // If far away, skip
                        if (mid.lengthSq() > 100) continue;
                        // If tiny, skip
                        if (piece.start.distanceTo(piece.end) < 0.000_001) continue;
                        newFrontier.push(
                            new AffineRay(
                                this.outerSymplectic(piece.start, true),
                                this.outerSymplectic(piece.end, true), false));

                    } catch (e) {
                    }
                }
            }
            frontier = newFrontier;
        }
        return preimages;
    }
}

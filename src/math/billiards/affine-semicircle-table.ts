import {Shape, Vector2} from "three";
import {closeEnough} from "../math-helpers";
import {Line} from "../geometry/line";
import {Generator} from "./new-billiard";
import {AffineRay} from "./affine-polygon-table";
import {AffineCircle} from "../geometry/affine-circle";
import {Complex} from "../complex";
import {AffineOuterBilliardTable, fixTime} from "./tables";

const SYMPLECTIC_PREIMAGE_PIECES = 2000;
const SYMPLECTIC_PREIMAGE_LENGTH = 20;
const PERIMETER = Math.PI + 2;
const CURVE_TIME = Math.PI / PERIMETER;
const FLAT_TIME = 2 / PERIMETER;
const UNIT_CIRCLE = new AffineCircle(new Complex(), 1);
const LEFT_POINT = new Complex(-1, 0);
const RIGHT_POINT = new Complex(1, 0);

export class AffineSemicircleTable extends AffineOuterBilliardTable {

    point(time: number): Vector2 {
        let t = fixTime(time);
        if (t <= CURVE_TIME) {
            let theta = t / CURVE_TIME;
            return new Vector2(Math.cos(theta), Math.sin(theta));
        } else {
            let alpha = (t - CURVE_TIME) / FLAT_TIME;
            return new Vector2(2 * alpha - 1, 0);
        }
    }

    time(point: Vector2): number {
        if (closeEnough(point.y, 0) && Math.abs(point.x) <= 1) {
            const alpha = (point.x + 1) / 2;
            return CURVE_TIME + FLAT_TIME * alpha;
        } else if (point.y > 0 && closeEnough(point.lengthSq(), 1)) {
            const theta = point.angle();
            return theta / CURVE_TIME;
        } else {
            throw Error('point is not on boundary of half disk');
        }
    }

    tangentHeading(time: number): number | undefined {
        let t = fixTime(time);
        if (t === 0 || t === CURVE_TIME) return undefined;
        if (t < CURVE_TIME) {
            const theta = t / CURVE_TIME;
            return theta + Math.PI / 2;
        } else {
            // on the flat
            return 0;
        }
    }

    leftTangentLine(circle: AffineCircle): Line {
        if (!circle.pointOnBoundary(LEFT_POINT.toVector2())) {
            let cp = circle.rightTangentPoint(LEFT_POINT);
            let l = Line.throughTwoPoints(LEFT_POINT, cp);
            if (Number.isFinite(l.slope) && l.slope < 0) return l;
        }

        if (!circle.pointOnBoundary(RIGHT_POINT.toVector2())) {
            let cp = circle.rightTangentPoint(RIGHT_POINT);
            let l = Line.throughTwoPoints(RIGHT_POINT, cp);
            if (Number.isFinite(l.slope) && l.slope > 0) return l;
        }

        let ls = UNIT_CIRCLE.leftTangentLineSegment(circle);
        if (this.pointOnBoundary(ls.end.toVector2())) return ls.line;
        throw Error('No right tangent line');
    }

    rightTangentLine(circle: AffineCircle): Line {
        if (!circle.pointOnBoundary(LEFT_POINT.toVector2())) {
            let cp = circle.leftTangentPoint(LEFT_POINT);
            let l = Line.throughTwoPoints(LEFT_POINT, cp);
            if (Number.isFinite(l.slope) && l.slope < 0) return l;
        }

        if (!circle.pointOnBoundary(RIGHT_POINT.toVector2())) {
            let cp = circle.leftTangentPoint(RIGHT_POINT);
            let l = Line.throughTwoPoints(RIGHT_POINT, cp);
            if (Number.isFinite(l.slope) && l.slope > 0) return l;
        }

        let ls = UNIT_CIRCLE.rightTangentLineSegment(circle);
        if (this.pointOnBoundary(ls.end.toVector2())) return ls.line;
        throw Error('No right tangent line');
    }

    containsPoint(point: Vector2): boolean {
        return point.y > 0 && point.lengthSq() < 1;
    }

    pointOnBoundary(point: Vector2): boolean {
        if (point.y > 0 && closeEnough(point.lengthSq(), 1)) return true;
        return (closeEnough(point.y, 0) && Math.abs(point.x) <= 1);
    }

    slicingRays: AffineRay[] = [];

    constructor() {
        super();
        this.slicingRays.push(
            new AffineRay(new Vector2(1, 0), new Vector2(2, 0), true)
        );
    }

    // iterateOuter(startingPoint: Vector2,
    //              flavor: Generator,
    //              iterations: number = 1): Vector2[][] {
    //     const points = [startingPoint];
    //     const centers = [];
    //     const tps = [];
    //     let point = startingPoint;
    //     for (let i = 0; i < iterations; i++) {
    //         let newPoint: Vector2;
    //         switch (flavor) {
    //         case Generator.LENGTH:
    //             try {
    //                 newPoint = this.outerRegular(point);
    //                 points.push(newPoint);
    //             } catch (e) {
    //                 console.log(e);
    //                 return [points];
    //             }
    //             break;
    //         case Generator.AREA:
    //             try {
    //                 newPoint = this.outerSymplectic(point);
    //                 points.push(newPoint);
    //                 centers.push(this.outerLengthCircle(point, false).center.toVector2());
    //                 tps.push(this.symplecticTangentPoint(point, false));
    //             } catch (e) {
    //                 console.log(e);
    //                 return [points, centers];
    //             }
    //             break;
    //         default:
    //             throw Error('Unknown billiard generator');
    //         }
    //         point = newPoint;
    //         if (closeEnough(newPoint.distanceTo(startingPoint), 0)) break;
    //     }
    //     return [points, centers, tps];
    // }

    private outerRegular(point: Vector2): Vector2 {
        const pivot = this.rightTangentPoint(point);
        return this.reflectRegular(pivot, point);
    }

    private reflectRegular(pivot: Vector2, point: Vector2) {
        const diff = pivot.clone().sub(point);
        return point.clone().add(diff.multiplyScalar(2));
    }

    rightTangentPoint(point: Vector2): Vector2 {
        const x = point.x;
        const y = point.y;
        if (y > 0 && Math.abs(x) < 1 && y <= Math.sqrt(1 - x * x)) {
            throw Error('Point is not in domain of forward map');
        }

        if (x >= 1 || (y > 0 && x > -1)) { // 1 / 2 / 6
            // right tangent of unit circle
            return UNIT_CIRCLE.rightTangentPoint(Complex.fromVector2(point)).toVector2();
        } else if (y >= 0 && x <= -1) { // 3
            return new Vector2(-1, 0);
        } else { // 4 / 5
            return new Vector2(1, 0);
        }
    }

    leftTangentPoint(point: Vector2): Vector2 {
        const x = point.x;
        const y = point.y;
        if ((y == 0 && x > 0) || (y > 0 && Math.abs(x) < 1 && y <= Math.sqrt(1 - x * x))) {
            throw Error('Point is not in domain of reverse map');
        }

        if (x <= -1 || (y > 0 && x < 1)) { // 2 / 3 / 4
            // left tangent of unit circle
            return UNIT_CIRCLE.leftTangentPoint(Complex.fromVector2(point)).toVector2();
        } else if (y > 0 && x >= 1) { // 1
            return new Vector2(1, 0);
        } else { // 5 / 6
            return new Vector2(-1, 0);
        }
    }

    private outerSymplectic(point: Vector2, reverse: boolean = false): Vector2 {
        const circle = this.outerLengthCircle(point, reverse);
        const forward = reverse ? this.leftTangentPoint(point) : this.rightTangentPoint(point);
        const fl = Line.throughTwoPoints(point, forward);
        let tl: Line;
        // find shared tangent between circle and unit circle
        if (reverse) {
            // if circle's leftmost point is in region 5 or if circle's bottommost point is in region 6:
            if ((circle.center.x - circle.radius >= -1 && circle.center.y < 0) ||
                (circle.center.x > 1 && circle.center.y - circle.radius < 0)) {
                tl = circle.rightTangentLine(new Complex(-1, 0));
                // want line through (-1, 0)

            }
            // if circle's rightmost point is in region 1:
            else if (circle.center.x + circle.radius > 1 && circle.center.y > 0) {
                // want line through (1, 0)
                tl = circle.rightTangentLine(new Complex(1, 0));
            }
            // otherwise:
            else {
                // want shared outer tangent
                tl = circle.rightTangentLineSegment(UNIT_CIRCLE).line;
            }
        } else {
            if (circle.center.x + circle.radius > 1 && circle.center.y < 0) {
                tl = circle.leftTangentLineSegment(UNIT_CIRCLE).line;
            }
            // if circle's rightmost point is in region 5 or if circle's bottommost point is in region 4:
            else if ((circle.center.x + circle.radius <= 1 && circle.center.y < 0) ||
                (circle.center.x < -1 && circle.center.y - circle.radius < 0)) {
                tl = circle.leftTangentLine(new Complex(-1, 0));
                // want line through (1, 0)

            }
            // if circle's leftmost point is in region 3:
            else if (circle.center.x - circle.radius < -1 && circle.center.y > 0) {
                // want line through (-1, 0)
                tl = circle.leftTangentLine(new Complex(-1, 0));
            }
            // otherwise:
            else {
                // want shared outer tangent
                tl = circle.rightTangentLineSegment(UNIT_CIRCLE).line;
            }
        }

        try {
            return tl.intersectLine(fl).toVector2();
        } catch (e) {
            console.log(fl, tl)
            throw e;
        }
    }

    // outerLengthCircle(point: Vector2, reverse: boolean): AffineCircle {
    //     const t1 = reverse ? this.leftTangentPoint(point) : this.rightTangentPoint(point);
    //     const t2 = reverse ? this.rightTangentPoint(point) : this.leftTangentPoint(point);
    //     const d = t1.distanceTo(point);
    //     const m = point.clone().add(point.clone().sub(t2).normalize().multiplyScalar(d));
    //     const lf = Line.throughTwoPoints(point, t1);
    //     const lb = Line.throughTwoPoints(point, t2);
    //     const pf = lf.perpAtPoint(t1);
    //     const pb = lb.perpAtPoint(m);
    //     try {
    //         const cc = pf.intersectLine(pb).toVector2();
    //         const radius = cc.distanceTo(t1);
    //         return new AffineCircle(Complex.fromVector2(cc), radius);
    //     } catch (e) {
    //         console.log(t1, t2);
    //         throw e;
    //     }
    // }

    // symplecticTangentPoint(point: Vector2, reverse: boolean): Vector2 {
    //     const t1 = reverse ? this.leftTangentPoint(point) : this.rightTangentPoint(point);
    //     const t2 = reverse ? this.rightTangentPoint(point) : this.leftTangentPoint(point);
    //     const d = t1.distanceTo(point);
    //     return point.clone().add(point.clone().sub(t2).normalize().multiplyScalar(d));
    // }

    override preimages(flavor: Generator, iterations: number): AffineRay[] {
        switch (flavor) {
        case Generator.LENGTH:
            return this.regularPreimages(iterations);
        case Generator.AREA:
            return this.symplecticPreimages(iterations);
        default:
            throw Error('Unknown generator');
        }
    }

    // private regularPreimages(iterations: number) {
    //     const preimages: AffineRay[] = [];
    //     let frontier: AffineRay[] = [];
    //     for (let i = 0; i < this.n; i++) {
    //         const v1 = this.vertices[i];
    //         const v2 = this.vertices[(i + 1) % this.n];
    //         const diff = v1.clone().sub(v2).normalize();
    //         frontier.push(new AffineRay(v1, v1.clone().add(diff), true));
    //     }
    //     for (let i = 0; i < iterations; i++) {
    //         preimages.push(...frontier);
    //         const newFrontier: AffineRay[] = [];
    //         for (let preimage of frontier) {
    //             const pieces = this.slicePreimage(preimage);
    //             for (let piece of pieces) {
    //                 let mid: Vector2;
    //                 if (piece.infinite) {
    //                     mid = piece.end;
    //                     // If far away and pointing away, skip
    //                     if (piece.start.lengthSq() > 10_000 &&
    //                         piece.end.clone().sub(piece.start).dot(piece.start) > 0) continue;
    //                 } else {
    //                     mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
    //                     // If far away, skip
    //                     if (mid.lengthSq() > 10_000) continue;
    //                     // If tiny, skip
    //                     if (piece.start.distanceToSquared(piece.end) < 0.000_000_01) continue;
    //                 }
    //                 let pivot: Vector2;
    //                 try {
    //                     pivot = this.reverseVertex(mid);
    //                 } catch (e) {
    //                     continue;
    //                 }
    //                 newFrontier.push(
    //                     new AffineRay(
    //                         this.reflectRegular(pivot, piece.start),
    //                         this.reflectRegular(pivot, piece.end),
    //                         piece.infinite)
    //                 );
    //             }
    //         }
    //         frontier = newFrontier;
    //     }
    //     return preimages;
    // }

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

    private regularPreimages(iterations: number): AffineRay[] {
        const preimages: AffineRay[] = [];
        let frontier: AffineRay[] = [];
        const v1 = new Vector2(-1, 0);
        const diff = v1.clone();
        const dl = SYMPLECTIC_PREIMAGE_LENGTH / SYMPLECTIC_PREIMAGE_PIECES;
        for (let i = 1; i < SYMPLECTIC_PREIMAGE_PIECES; i++) {
            frontier.push(new AffineRay(
                v1.clone().add(diff.clone().multiplyScalar(i * dl)),
                v1.clone().add(diff.clone().multiplyScalar((i + 1) * dl)),
                false));
            // frontier.push(new AffineRay(
            //     v2.clone().sub(diff.clone().multiplyScalar(i * dl)),
            //     v2.clone().sub(diff.clone().multiplyScalar((i + 1) * dl)),
            //     false));
        }
        for (let i = 0; i < iterations; i++) {
            try {
                for (let f of frontier) {
                    preimages.push(f);
                }
            } catch (e) {
                console.log('fail', preimages.length, frontier.length);
                return preimages;
            }
            const newFrontier: AffineRay[] = [];
            for (let segment of frontier) {
                let pieces: AffineRay[];
                try {
                    pieces = this.slicePreimage(segment, true);
                } catch (e) {
                    continue;
                }
                const extraPieces = [];
                for (let piece of pieces) {
                    try {
                        const mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
                        // If far away, skip
                        if (mid.lengthSq() > SYMPLECTIC_PREIMAGE_LENGTH * SYMPLECTIC_PREIMAGE_LENGTH) continue;
                        const l = piece.start.distanceTo(piece.end);
                        // If tiny, skip
                        if (l < dl / 5 || l > dl * 10) continue;
                        // if giant, break apart
                        if (l > 5 * dl) {
                            const n = Math.ceil(l / dl);
                            const dd = l / n;
                            const dv = piece.end.clone().sub(piece.start).normalize();
                            for (let j = 0; j < n; j++) {
                                extraPieces.push(
                                    new AffineRay(
                                        piece.start.clone().addScaledVector(dv, j * dd),
                                        piece.start.clone().addScaledVector(dv, (j + 1) * dd), false)
                                );
                            }
                            continue;
                        }
                        newFrontier.push(
                            new AffineRay(
                                this.outerRegular(piece.start),
                                this.outerRegular(piece.end), false));

                    } catch (e) {
                    }
                }
                for (let piece of extraPieces) {
                    try {
                        newFrontier.push(
                            new AffineRay(
                                this.outerRegular(piece.start),
                                this.outerRegular(piece.end), false));
                    } catch (e) {
                    }
                }
            }
            frontier = newFrontier;
        }
        return preimages;
    }

    private symplecticPreimages(iterations: number): AffineRay[] {
        const preimages: AffineRay[] = [];
        let frontier: AffineRay[] = [];
        const v1 = new Vector2(-1, 0);
        const diff = v1.clone();
        const dl = SYMPLECTIC_PREIMAGE_LENGTH / SYMPLECTIC_PREIMAGE_PIECES;
        for (let i = 1; i < SYMPLECTIC_PREIMAGE_PIECES; i++) {
            frontier.push(new AffineRay(
                v1.clone().add(diff.clone().multiplyScalar(i * dl)),
                v1.clone().add(diff.clone().multiplyScalar((i + 1) * dl)),
                false));
            // frontier.push(new AffineRay(
            //     v2.clone().sub(diff.clone().multiplyScalar(i * dl)),
            //     v2.clone().sub(diff.clone().multiplyScalar((i + 1) * dl)),
            //     false));
        }
        for (let i = 0; i < iterations; i++) {
            try {
                for (let f of frontier) {
                    preimages.push(f);
                }
            } catch (e) {
                console.log('fail', preimages.length, frontier.length);
                return preimages;
            }
            const newFrontier: AffineRay[] = [];
            for (let segment of frontier) {
                let pieces: AffineRay[];
                try {
                    pieces = this.slicePreimage(segment, true);
                } catch (e) {
                    continue;
                }
                const extraPieces = [];
                for (let piece of pieces) {
                    try {
                        const mid = piece.start.clone().add(piece.end).multiplyScalar(0.5);
                        // If far away, skip
                        if (mid.lengthSq() > SYMPLECTIC_PREIMAGE_LENGTH * SYMPLECTIC_PREIMAGE_LENGTH) continue;
                        const l = piece.start.distanceTo(piece.end);
                        // If tiny, skip
                        if (l < dl / 5 || l > dl * 10) continue;
                        // if giant, break apart
                        if (l > 5 * dl) {
                            const n = Math.ceil(l / dl);
                            const dd = l / n;
                            const dv = piece.end.clone().sub(piece.start).normalize();
                            for (let j = 0; j < n; j++) {
                                extraPieces.push(
                                    new AffineRay(
                                        piece.start.clone().addScaledVector(dv, j * dd),
                                        piece.start.clone().addScaledVector(dv, (j + 1) * dd), false)
                                );
                            }
                            continue;
                        }
                        newFrontier.push(
                            new AffineRay(
                                this.outerSymplectic(piece.start, true),
                                this.outerSymplectic(piece.end, true), false));

                    } catch (e) {
                    }
                }
                for (let piece of extraPieces) {
                    try {
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

    override shape(n: number): Shape {
        const points = [];
        const dTheta = Math.PI / n;
        for (let i = 0; i <= n; i++) {
            let theta = i * dTheta;
            points.push(new Vector2(Math.cos(theta), Math.sin(theta)));
        }
        const shape = new Shape(points);
        shape.closePath();
        return shape;
    }
}
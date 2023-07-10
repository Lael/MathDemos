import {Vector2} from "three";
import {closeEnough} from "../math-helpers";
import {Line} from "../geometry/line";
import {Flavor} from "./new-billiard";
import {AffineCircle, AffineRay,} from "./new-affine-polygon-table";

const SYMPLECTIC_PREIMAGE_PIECES = 2000;
const SYMPLECTIC_PREIMAGE_LENGTH = 20;

export class AffineSemicircleTable {

    slicingRays: AffineRay[] = [];

    constructor() {
        this.slicingRays.push(
            new AffineRay(new Vector2(1, 0), new Vector2(2, 0), true)
        );
    }

    iterateOuter(startingPoint: Vector2,
                 flavor: Flavor,
                 iterations: number = 1): Vector2[][] {
        const points = [startingPoint];
        const centers = [];
        const tps = [];
        let point = startingPoint;
        for (let i = 0; i < iterations; i++) {
            let newPoint: Vector2;
            switch (flavor) {
            case Flavor.REGULAR:
                try {
                    newPoint = this.outerRegular(point);
                    points.push(newPoint);
                } catch (e) {
                    console.log(e);
                    return [points];
                }
                break;
            case Flavor.SYMPLECTIC:
                try {
                    newPoint = this.outerSymplectic(point);
                    points.push(newPoint);
                    centers.push(this.symplecticOuterCircle(point, false).center);
                    tps.push(this.symplecticTangentPoint(point, false));
                } catch (e) {
                    console.log(e);
                    return [points, centers];
                }
                break;
            default:
                throw Error('Unknown billiard flavor');
            }
            point = newPoint;
            if (closeEnough(newPoint.distanceTo(startingPoint), 0)) break;
        }
        return [points, centers, tps];
    }

    private outerRegular(point: Vector2): Vector2 {
        const pivot = this.forwardPoint(point);
        return this.reflectRegular(pivot, point);
    }

    private reflectRegular(pivot: Vector2, point: Vector2) {
        const diff = pivot.clone().sub(point);
        return point.clone().add(diff.multiplyScalar(2));
    }

    forwardPoint(point: Vector2): Vector2 {
        const x = point.x;
        const y = point.y;
        if (y > 0 && Math.abs(x) < 1 && y <= Math.sqrt(1 - x * x)) {
            throw Error('Point is not in domain of forward map');
        }

        if (x >= 1 || (y > 0 && x > -1)) { // 1 / 2 / 6
            // right tangent of unit circle
            return new AffineCircle(new Vector2(0, 0), 1).tangentPoint(point, true);
        } else if (y >= 0 && x <= -1) { // 3
            return new Vector2(-1, 0);
        } else { // 4 / 5
            return new Vector2(1, 0);
        }
    }

    reversePoint(point: Vector2): Vector2 {
        const x = point.x;
        const y = point.y;
        if ((y == 0 && x > 0) || (y > 0 && Math.abs(x) < 1 && y <= Math.sqrt(1 - x * x))) {
            throw Error('Point is not in domain of reverse map');
        }

        if (x <= -1 || (y > 0 && x < 1)) { // 2 / 3 / 4
            // left tangent of unit circle
            return new AffineCircle(new Vector2(0, 0), 1).tangentPoint(point, false);
        } else if (y > 0 && x >= 1) { // 1
            return new Vector2(1, 0);
        } else { // 5 / 6
            return new Vector2(-1, 0);
        }
    }

    private outerSymplectic(point: Vector2, reverse: boolean = false): Vector2 {
        const circle = this.symplecticOuterCircle(point, reverse);
        const forward = reverse ? this.reversePoint(point) : this.forwardPoint(point);
        const fl = Line.throughTwoPoints(point, forward);
        let tl: Line;
        // find shared tangent between circle and unit circle
        if (reverse) {
            // if circle's leftmost point is in region 5 or if circle's bottommost point is in region 6:
            if ((circle.center.x - circle.radius >= -1 && circle.center.y < 0) ||
                (circle.center.x > 1 && circle.center.y - circle.radius < 0)) {
                tl = circle.tangentLine(new Vector2(-1, 0), true);
                // want line through (-1, 0)

            }
            // if circle's rightmost point is in region 1:
            else if (circle.center.x + circle.radius > 1 && circle.center.y > 0) {
                // want line through (1, 0)
                tl = circle.tangentLine(new Vector2(1, 0), true);
            }
            // otherwise:
            else {
                // want shared outer tangent
                tl = circle.outerTangent(new AffineCircle(new Vector2(), 1), true);
            }
        } else {
            if (circle.center.x + circle.radius > 1 && circle.center.y < 0) {
                tl = circle.outerTangent(new AffineCircle(new Vector2(), 1), false);
            }
            // if circle's rightmost point is in region 5 or if circle's bottommost point is in region 4:
            else if ((circle.center.x + circle.radius <= 1 && circle.center.y < 0) ||
                (circle.center.x < -1 && circle.center.y - circle.radius < 0)) {
                tl = circle.tangentLine(new Vector2(1, 0), false);
                // want line through (1, 0)

            }
            // if circle's leftmost point is in region 3:
            else if (circle.center.x - circle.radius < -1 && circle.center.y > 0) {
                // want line through (-1, 0)
                tl = circle.tangentLine(new Vector2(-1, 0), false);
            }
            // otherwise:
            else {
                // want shared outer tangent
                tl = circle.outerTangent(new AffineCircle(new Vector2(), 1), false);
            }
        }

        try {
            return tl.intersectLine(fl).toVector2();
        } catch (e) {
            console.log(fl, tl)
            throw e;
        }
    }

    symplecticOuterCircle(point: Vector2, reverse: boolean): AffineCircle {
        const t1 = reverse ? this.reversePoint(point) : this.forwardPoint(point);
        const t2 = reverse ? this.forwardPoint(point) : this.reversePoint(point);
        const d = t1.distanceTo(point);
        const m = point.clone().add(point.clone().sub(t2).normalize().multiplyScalar(d));
        const lf = Line.throughTwoPoints(point, t1);
        const lb = Line.throughTwoPoints(point, t2);
        const pf = lf.perpAtPoint(t1);
        const pb = lb.perpAtPoint(m);
        try {
            const cc = pf.intersectLine(pb).toVector2();
            const radius = cc.distanceTo(t1);
            return new AffineCircle(cc, radius);
        } catch (e) {
            console.log(t1, t2);
            throw e;
        }
    }

    symplecticTangentPoint(point: Vector2, reverse: boolean): Vector2 {
        const t1 = reverse ? this.reversePoint(point) : this.forwardPoint(point);
        const t2 = reverse ? this.forwardPoint(point) : this.reversePoint(point);
        const d = t1.distanceTo(point);
        return point.clone().add(point.clone().sub(t2).normalize().multiplyScalar(d));
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
}
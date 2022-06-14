import {Complex} from "./complex";

export function normalizeAngle(theta: number, low: number = -Math.PI) {
    if (!isFinite(theta)) throw Error('Cannot normalize non-finite number');
    while (theta < low) theta += 2 * Math.PI;
    while (theta >= low + 2 * Math.PI) theta -= 2 * Math.PI;
    return theta;
}

export function closeEnough(r1: number, r2: number) {
    if (!isFinite(r1) || !isFinite(r2)) return false;
    return Math.abs(r1 - r2) < 0.000_000_1;
}

export function solveQuadratic(a: Complex, b: Complex, c: Complex): Complex[] {
    const d = b.times(b).minus(a.times(c).scale(4)).sqrt();
    if (d.isZero()) return [b.scale(-0.5).over(a)];
    return [b.scale(-1).minus(d).over(a.scale(2)), b.scale(-1).plus(d).over(a.scale(2))];
}

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
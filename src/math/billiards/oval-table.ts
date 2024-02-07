import {Vector2} from "three";
import {normalizeAngle} from "../math-helpers";

export type Parametrization = (t: number) => Vector2;
export type ContainmentTest = (v: Vector2) => boolean;
export type TangentSolver = (v: Vector2) => Vector2;

export function lpCircle(p: number, xScale: number = 1): OvalTable {
    // x^p + y^p = 1
    // x(t) = cos^(2/p)(t), x'(t) = -(2/p)cos^(2/p - 1)(t)*sin(t)
    // y(t) = sin^(2/p)(t), y'(t) = (2/p)sin^(2/p - 1)(t)*cos(t)
    const parametrization = (t: number) => {
        const c = Math.cos(2 * Math.PI * t);
        const s = Math.sin(2 * Math.PI * t);
        const r = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p);
        return new Vector2(r * c * xScale, r * s);
    };
    const derivative = (t: number) => {
        const c = Math.cos(2 * Math.PI * t);
        const s = Math.sin(2 * Math.PI * t);
        const r = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p);

        const rp = -1 / p * Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), -1 / p - 1) * (
            -Math.pow(Math.abs(c), p - 1) * s * c / Math.abs(c) + Math.pow(Math.abs(s), p - 1) * c * s / Math.abs(s)
        ) * p;

        return new Vector2(
            (rp * c - r * s) * xScale,
            rp * s + r * c,
        ).normalize();

    }
    const containmentTest = (v: Vector2) => Math.pow(Math.abs(v.x), p) + Math.pow(Math.abs(v.y), p) <= 1;

    const rightTangentSolver = (v: Vector2) => {
        // v_x - sign(cos(t)) * cos(t)^tp = -c * cos(t)^(tp-1) * sin(t)
        // v_y - sign(sin(t)) * sin(t)^tp = +c * sin(t)^(tp-1) * cos(t)

        // v_x - cos(t) = -c * sin(t)
        // v_y - sin(t) = +c * cos(t)
        // (v_x - cos(t)) * cos(t) = (sin(t) - v_y) * sin(t)
        // v_x * cos(t) - cos^2(t) = sin^2(t) - v_y * sin(t)
        // v_x * cos(t) = 1 - v_y * sin(t)=
        const x = 0;
        const y = 1;
        return new Vector2(x, y);
    };
    return new OvalTable(parametrization, derivative, containmentTest, rightTangentSolver);
}

// Assumed to be smooth and strictly convex
export class OvalTable {
    constructor(
        private readonly parametrization: Parametrization,
        private readonly tangent: Parametrization,
        private readonly contains: ContainmentTest,
        private readonly rightTangent?: TangentSolver) {
    }

    points(divisions: number): Vector2[] {
        const points = [];
        for (let i = 0; i < divisions; i++) {
            points.push(this.parametrization(i / divisions));
        }
        return points;
    }

    tangentialAngle(t: number, p: Vector2, sign: number) {
        const r = this.parametrization(t)
        return angle3(
            r,
            r.clone().add(this.tangent(t).multiplyScalar(sign)),
            p,
        );
    }

    // right as viewed by the point
    leftTangentPoint(point: Vector2): Vector2 {
        if (this.contains(point)) {
            throw Error('point inside table');
        }
        const t1 = point.angle() / (2 * Math.PI) + 0.5;
        const t2 = point.angle() / (2 * Math.PI) + 1;
        const a1 = this.tangentialAngle(t1, point, 1);
        const a2 = this.tangentialAngle(t2, point, 1);
        if (a1 === 0) return this.parametrization(t1);
        if (a2 === 0) return this.parametrization(t2);
        let interval: Vector2;
        let ma;
        if (a1 > 0 && a2 < 0) {
            interval = new Vector2(t1, t2);
        } else {
            throw Error('bad parametrization');
        }
        let m = 0.5 * (interval.x + interval.y);
        let safety = 0;
        while (Math.abs(ma = this.tangentialAngle(m, point, 1)) > 0.000_000_1 && safety < 100) {
            safety++;
            if (ma === 0) break;
            else if (ma > 0) interval.x = m;
            else if (ma < 0) interval.y = m;
            m = 0.5 * (interval.x + interval.y);
        }

        return this.parametrization(m);
    }

    // right as viewed by the point
    rightTangentPoint(point: Vector2): Vector2 {
        if (this.contains(point)) {
            throw Error('point inside table');
        }
        // if (this.rightTangent) return this.rightTangent(point);
        const t1 = point.angle() / (2 * Math.PI);
        const t2 = point.angle() / (2 * Math.PI) + 0.5;
        const a1 = this.tangentialAngle(t1, point, -1);
        const a2 = this.tangentialAngle(t2, point, -1);
        if (a1 === 0) return this.parametrization(t1);
        if (a2 === 0) return this.parametrization(t2);
        let interval: Vector2;
        let ma;
        if (a1 > 0 && a2 < 0) {
            interval = new Vector2(t1, t2);
        } else {
            throw Error('bad parametrization');
        }
        let m = 0.5 * (interval.x + interval.y);
        let safety = 0;
        while (Math.abs(ma = this.tangentialAngle(m, point, -1)) > 0.000_000_1 && safety < 100) {
            safety++;
            if (ma === 0) break;
            else if (ma > 0) interval.x = m;
            else if (ma < 0) interval.y = m;
            m = 0.5 * (interval.x + interval.y);
        }

        return this.parametrization(m);
    }
}

function angle3(v1: Vector2, v2: Vector2, v3: Vector2): number {
    try {
        const h1 = v2.clone().sub(v1).angle();
        const h2 = v3.clone().sub(v1).angle();
        return normalizeAngle(h2 - h1, -Math.PI);
    } catch (e) {
        console.log(v1, v2, v3);
        throw e;
    }
}
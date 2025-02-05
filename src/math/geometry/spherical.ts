import {Color, ColorRepresentation, Matrix4, Mesh, MeshBasicMaterial, SphereGeometry, Vector2, Vector3} from "three";
import {closeEnough} from "../math-helpers";

export class SpherePoint {
    mesh: Mesh | undefined;

    constructor(readonly coords: Vector3) {
        if (coords.length() === 0) throw Error('point not on sphericalSphere');
        this.coords.normalize();
    }

    get phi(): number {
        return Math.acos(this.z);
    }

    get theta(): number {
        if (new Vector2(this.x, this.y).length() === 0) return 0;
        return Math.atan2(this.y, this.x);
    }

    get x(): number {
        return this.coords.x;
    }

    get y(): number {
        return this.coords.y;
    }

    get z(): number {
        return this.coords.z;
    }

    distanceTo(other: SpherePoint): number {
        return Math.acos(this.coords.dot(other.coords));
    }

    reflect(other: SpherePoint): SpherePoint {
        let mat = new Matrix4().makeRotationAxis(this.coords, Math.PI);
        return new SpherePoint(other.coords.applyMatrix4(mat));
    }

    drawable(color: ColorRepresentation, radius = 0.05): Mesh {
        if (this.mesh === undefined) {
            this.mesh = new Mesh(
                new SphereGeometry(),
                new MeshBasicMaterial(),
            );
        }
        this.mesh.geometry = new SphereGeometry(radius);
        (this.mesh.material as MeshBasicMaterial).color = new Color(color);
        return this.mesh;
    }
}

function sphericalLerp(p1: SpherePoint, p2: SpherePoint, alpha: number): SpherePoint {
    const normal = p1.coords.cross(p2.coords);
    let angle = alpha * p1.distanceTo(p2);
    return new SpherePoint(
        p1.coords.applyMatrix4(
            new Matrix4().makeRotationAxis(normal, angle)
        )
    );
}

export class GreatCircle {
    constructor(readonly normal: Vector3) {
        if (normal.length() === 0) {
            throw Error('zero vector is not a normal vector');
        }
    }

    static throughTwoPoints(p1: SpherePoint, p2: SpherePoint): GreatCircle {
        const normal = p1.coords.clone().cross(p2.coords);
        return new GreatCircle(normal);
    }

    intersectGreatCircle(other: GreatCircle): SpherePoint[] {
        let v = this.normal.cross(other.normal);
        if (closeEnough(v.length(), 0)) {
            throw Error('great circles coincide');
        }
        return [new SpherePoint(v), new SpherePoint(v.clone().multiplyScalar(-1))];
    }

    containsPoint(point: SpherePoint) {
        return closeEnough(this.normal.cross(point.coords).length(), 0);
    }

    points(n: number): Vector3[] {
        const phi = this.dual.phi;
        const theta = this.dual.theta;
        return arcPoints(phi, theta, 0, 2 * Math.PI, n);
    }

    get dual(): SpherePoint {
        return new SpherePoint(this.normal);
    }
}

export class SphericalArc {
    readonly greatCircle: GreatCircle;

    constructor(readonly p1: SpherePoint, readonly p2: SpherePoint) {
        this.greatCircle = GreatCircle.throughTwoPoints(p1, p2);
    }

    containsPoint(point: SpherePoint) {
        return closeEnough(
            point.distanceTo(this.p1) + point.distanceTo(this.p2),
            this.length
        );
    }

    get length(): number {
        return this.p1.distanceTo(this.p2);
    }
}

export class SphericalPolygon {
    n: number;
    arcs: SphericalArc[] = [];

    constructor(readonly vertices: SpherePoint[]) {
        this.n = vertices.length;
        for (let i = 0; i < this.n; i++) {
            this.arcs.push(new SphericalArc(vertices[i], vertices[(i + 1) % this.n]));
        }
    }

    dual(): SphericalPolygon {
        const dualVertices = [];
        for (let i = 0; i < this.n; i++) {
            dualVertices.push(new SpherePoint(this.arcs[i].greatCircle.normal));
        }
        return new SphericalPolygon(dualVertices);
    }
}

export class SphericalCircle {
    constructor(readonly center: SpherePoint, readonly radius: number) {
    }
}

function arcPoints(phi: number, theta: number, start: number, end: number, n: number): Vector3[] {
    const r1 = new Matrix4().makeRotationY(phi);
    const r2 = new Matrix4().makeRotationZ(theta);
    const mat = r1.premultiply(r2);
    const pts = [];
    const dt = (end - start) / (n - 1);
    for (let i = 0; i < n; i++) {
        const t = start + i * dt;
        pts.push(new Vector3(
            Math.cos(t),
            Math.sin(t),
            0
        ).applyMatrix4(mat));
    }
    return pts;
}
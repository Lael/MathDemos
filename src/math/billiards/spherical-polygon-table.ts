import {SpherePoint, SphericalPolygon} from "../geometry/spherical";
import {SphericalOuterBilliardTable} from "./tables";
import {Vector3} from "three";

export class SphericalPolygonTable extends SphericalOuterBilliardTable {
    polygon: SphericalPolygon;

    constructor(readonly vertices: SpherePoint[]) {
        super();
        this.polygon = new SphericalPolygon(vertices);
    }

    containsPoint(point: SpherePoint): boolean {
        throw new Error('not yet implemented');
    }

    leftTangentPoint(point: SpherePoint): SpherePoint {
        throw new Error('not yet implemented');
    }

    point(time: number): SpherePoint {
        throw new Error('not yet implemented');
    }

    pointOnBoundary(point: SpherePoint): boolean {
        for (let arc of this.polygon.arcs) {
            if (arc.containsPoint(point)) {
                return true;
            }
        }
        return false;
    }

    rightTangentPoint(point: SpherePoint): SpherePoint {
        throw new Error('not yet implemented');
    }

    tangentVector(time: number): Vector3 | undefined {
        throw new Error('not yet implemented');
    }

    time(point: SpherePoint): number {
        throw new Error('not yet implemented');
    }
}
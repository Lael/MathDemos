import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../hyperbolic/hyperbolic";
import {BilliardsSettings, Duality} from "./billiards";
import {Complex} from "../complex";
import {Circle} from "../geometry/geometry";
import {Drawable} from "../../graphics/shapes/drawable";
import {HyperPolygon} from "../hyperbolic/hyper-polygon";
import {BilliardTable} from "./tables";

export class HyperbolicPolygonTable extends BilliardTable<HyperPoint, HyperGeodesic> {
    private readonly vertices: HyperPoint[] = [];

    constructor(settings: BilliardsSettings) {
        super(settings);
        const da = 2 * Math.PI / settings.polygonDetails.vertexCount
        for (let i = 0; i < settings.polygonDetails.vertexCount; i++) {
            this.vertices.push(HyperPoint.fromPoincare(
                Complex.polar(HyperPoint.trueToPoincare(settings.polygonDetails.radius), i * da))
            );
        }
    }

    leftInvertPoint(point: HyperPoint): HyperPoint {
        throw new Error('NYI');
    }

    leftTangentGeodesic(object: Circle<HyperPoint> | HyperPoint): HyperGeodesic {
        throw new Error('NYI');
    }

    rightInvertPoint(point: HyperPoint): HyperPoint {
        throw new Error('NYI');
    }

    rightTangentGeodesic(object: Circle<HyperPoint> | HyperPoint): HyperGeodesic {
        throw new Error('NYI');
    }

    intersect(time: number, heading: number): number {
        return 0;
    }

    invertPoint(point: HyperPoint): HyperPoint {
        throw new Error('NYI');
    }

    point(time: number): HyperPoint {
        throw new Error('NYI');
    }

    tangentGeodesic(object: Circle<HyperPoint> | HyperPoint): HyperGeodesic {
        throw new Error('NYI');
    }

    tangentHeading(time: number): number | undefined {
        return undefined;
    }

    toDrawable(gl: WebGL2RenderingContext, model: HyperbolicModel | undefined): Drawable {
        const fillColor = this.settings.duality === Duality.INNER ? undefined : BilliardTable.TABLE_FILL;
        return HyperPolygon.fromVertices(...this.vertices)
            .polygon(model || HyperbolicModel.POINCARE, gl, fillColor, BilliardTable.TABLE_BORDER, 0.1);
    }

    flatIntervals(): number[][] {
        return [];
    }

    leftTangentPoint(object: Circle<HyperPoint> | HyperPoint): HyperPoint {
        throw new Error('NYI');
    }

    rightTangentPoint(object: Circle<HyperPoint> | HyperPoint): HyperPoint {
        throw new Error('NYI');
    }

    preimages(): HyperGeodesic[] {
        return [];
    }
}
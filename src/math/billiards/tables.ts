import {AffineGeodesic, AffinePoint, Circle, GeodesicLike, PointLike} from "../geometry/geometry";
import {HyperbolicModel} from "../hyperbolic/hyperbolic";
import {Drawable} from "../../graphics/shapes/drawable";
import {Color} from "../../graphics/shapes/color";
import {Complex} from "../complex";
import {BilliardsSettings} from "./billiards";

export abstract class BilliardTable<Point extends PointLike, Geodesic extends GeodesicLike<Point>> {
    static readonly TABLE_FILL = Color.billiardsScheme.tableFill;
    static readonly TABLE_BORDER = Color.billiardsScheme.tableBorder;
    static readonly PATH_THICKNESS = 0.005;
    static readonly TABLE_BORDER_THICKNESS = 0.0075;
    readonly singularities: Drawable[] = [];

    protected constructor(protected readonly settings: BilliardsSettings) {
    }

    // Evaluate an anti-clockwise parametrization of the boundary of the table.
    abstract point(time: number): Point;

    // Find the (anti-clockwise) direction of the tangent line at a specific point.
    abstract tangentHeading(time: number): number | undefined;

    // Given a time and a heading, construct a chord and find its next intersection with the table (as a time).
    abstract intersect(time: number, heading: number): number;

    // Geodesic starting from object and passing through a point on the outside of the table on the right side.
    abstract rightTangentGeodesic(object: Point | Circle<Point>): Geodesic;

    // The point on the table on the right tangent geodesic.
    abstract rightTangentPoint(object: Point | Circle<Point>): Point;

    // Geodesic starting from object and passing through a point on the outside of the table on the left side.
    abstract leftTangentGeodesic(object: Point | Circle<Point>): Geodesic;

    // The point on the table on the left tangent geodesic.
    abstract leftTangentPoint(object: Point | Circle<Point>): Point;

    // Invert point through right tangent point.
    abstract rightInvertPoint(point: Point): Point;

    // Invert point through left tangent point.
    abstract leftInvertPoint(point: Point): Point;

    // Return a drawable representation of the table itself.
    abstract toDrawable(gl: WebGL2RenderingContext,
                        model: HyperbolicModel | undefined,
                        fill: Color | undefined,
                        border: Color | undefined): Drawable;
}

export function fixTime(time: number): number {
    let t = time % 1;
    if (t < 0) t += 1;
    return t;
}

// Arguments:
// ip, g1, g2, tp
// ip is intersection, tp lies on g1, circle should be between positive directions of g1 and g2
export function affineFourthCircle(ip: AffinePoint,
                                   g1: AffineGeodesic,
                                   g2: AffineGeodesic,
                                   tp: AffinePoint): Circle<AffinePoint> {
    const v1 = g1.p2.resolve().minus(g1.p1.resolve()).normalize();
    const v2 = g2.p2.resolve().minus(g2.p1.resolve()).normalize();
    const bv = v1.plus(v2).normalize();
    const ab = new AffineGeodesic(ip, new AffinePoint(ip.resolve().plus(bv)), true, true);
    const pv = v1.times(new Complex(0, 1));
    const pl = new AffineGeodesic(tp, new AffinePoint(tp.resolve().plus(pv)), true, true);
    const c = ab.intersect(pl);
    if (c === undefined) throw Error('No circle intersection');
    return new Circle<AffinePoint>(
        c, c.distance(tp)
    );
}

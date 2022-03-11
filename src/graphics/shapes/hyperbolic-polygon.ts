import {Polygon2D, PolygonSpec} from "./polygon2D";
import {Complex} from "../../math/complex";
import {HyperbolicGeodesic} from "../../math/hyperbolic/hyperbolic-geodesic";
import {Arc, ArcSpec} from "./arc";
import {Color} from "./color";
import {normalizeAngle} from "../../math/math-helpers";

export class HyperbolicPolygon extends Polygon2D {
    readonly geodesics: HyperbolicGeodesic[];

    constructor(gl: WebGL2RenderingContext, spec: HyperbolicPolygonSpec) {
        super(gl, new PolygonSpec(
            HyperbolicPolygon.interpolateVertices(spec.vertices),
            spec.fillColor,
            spec.borderColor,
        ));
        this.geodesics = HyperbolicPolygon.generateGeodesics(spec.vertices);
    }

    private static interpolateVertices(vertices: Complex[]): Complex[] {
        if (vertices.length < 3) throw Error('Degenerate polygon');
        const interpolated: Complex[] = [];
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % n];
            const g = new HyperbolicGeodesic(v1, v2);
            if (g.isDiameter) {
                interpolated.push(v1);
                continue;
            }
            const c = g.circle!;
            const a1 = c.center.heading(v1);
            const a2 = normalizeAngle(c.center.heading(v2), a1 - Math.PI);
            const arcPoints = Arc.interpolate(new ArcSpec(
                c.center,
                c.radius,
                Math.min(a1, a2),
                Math.max(a1, a2),
                Color.BLACK));
            if (!arcPoints[0].equals(v1)) arcPoints.reverse();
            arcPoints.pop();
            interpolated.push(...arcPoints);
        }
        return interpolated;
    }

    private static generateGeodesics(vertices: Complex[]): HyperbolicGeodesic[] {
        const gs: HyperbolicGeodesic[] = [];
        const n = vertices.length;
        for (let i = 0; i < n; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % n];
            const g = new HyperbolicGeodesic(v1, v2);
            gs.push(g);
        }
        return gs;
    }
}

export class HyperbolicPolygonSpec extends PolygonSpec {

}
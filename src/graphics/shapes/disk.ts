import {Polygon2D, PolygonSpec} from "./polygon2D";
import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Arc, ArcSpec} from "./arc";

export class Disk extends Polygon2D {
    constructor(gl: WebGL2RenderingContext, spec: DiskSpec) {
        const arcSpec = new ArcSpec(spec.center, spec.radius, 0, 2 * Math.PI, Color.BLACK);
        const vertices = Arc.interpolate(arcSpec);
        super(gl, new PolygonSpec(vertices, spec.fill, spec.border));
    }
}

export class DiskSpec {
    constructor(readonly center: Complex,
                readonly radius: number,
                readonly fill: Color|undefined,
                readonly border: Color|undefined) {
    }
}
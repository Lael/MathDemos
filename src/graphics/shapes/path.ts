import {Drawable} from "./drawable";
import {Complex} from "../../math/complex";
import {Color} from "./color";
import {Shape2D, Vertex2D} from "./shape2D";
import {HyperbolicGeodesic} from "../../math/hyperbolic/hyperbolic-geodesic";
import {Arc as ArcShape, Arc, ArcSpec} from "./arc";
import {ArcSegment as ArcSegment} from "../../math/geometry/arc-segment";
import {Segment} from "../../math/geometry/segment";
import {LineSegment} from "../../math/geometry/line-segment";

export class Path extends Drawable {
    constructor(gl: WebGL2RenderingContext, spec: PathSpec) {
        const vertices: Vertex2D[] = spec.vertices.map(v => new Vertex2D(v, spec.color));
        const path = new Shape2D(gl, vertices, gl.LINE_STRIP)
        super([path]);
    }

    static fromHyperbolicGeodesic(gl: WebGL2RenderingContext, g: HyperbolicGeodesic, color: Color = Color.ONYX): Path {
        if (g.isDiameter) {
            return new Path(gl, new PathSpec(
                [g.ideal1, g.ideal2],
                color,
            ));
        }
        return new Arc(gl, new ArcSpec(
            g.circle!.center,
            g.circle!.radius,
            g.startAngle,
            g.endAngle,
            color,
        ));
    }

    static fromSegment(gl: WebGL2RenderingContext, s: Segment, color: Color = Color.ONYX): Path {
        if (s instanceof LineSegment) {
            return new Path(gl, new PathSpec([s.start, s.end], color));
        } else if (s instanceof ArcSegment) {
            return new ArcShape(gl, new ArcSpec(
                s.center,
                s.radius,
                s.startAngle,
                s.endAngle,
                color,
            ));
        } else {
            throw Error('Unknown segment type')
        }
    }
}

export class PathSpec {
    constructor(readonly vertices: Complex[], readonly color: Color) {}
}
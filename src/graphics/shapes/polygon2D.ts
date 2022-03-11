import {Shape2D, Vertex2D} from "./shape2D";
import {Color} from "./color";
import {Drawable2D} from "./drawable2D";
import {Complex} from "../../math/complex";

export class Polygon2D extends Drawable2D {
    private fill?: Shape2D;
    private border?: Shape2D;

    constructor(gl: WebGL2RenderingContext, spec: PolygonSpec) {
        const shapes: Shape2D[] = [];
        let fill: Shape2D|undefined = undefined;
        let border: Shape2D|undefined = undefined;
        if (spec.fillColor) {
            fill = new Shape2D(gl, Polygon2D.fillVertices(spec.vertices, spec.fillColor), gl.TRIANGLES);
            shapes.push(fill);
        }
        if (spec.borderColor) {
            border = new Shape2D(gl, Polygon2D.borderVertices(spec.vertices, spec.borderColor), gl.LINE_STRIP);
            shapes.push(border);
        }
        super(shapes);
        if (fill) this.fill = fill;
        if (border) this.border = border;
    }

    private static fillVertices(points: Complex[], fill: Color): Vertex2D[] {
        const vertices: Vertex2D[] = [];
        const triangles = Polygon2D.triangularize(points);
        for (let t of triangles) {
            vertices.push(new Vertex2D(points[t.a], fill));
            vertices.push(new Vertex2D(points[t.b], fill));
            vertices.push(new Vertex2D(points[t.c], fill));
        }
        return vertices;
    }

    private static borderVertices(points: Complex[], border: Color): Vertex2D[] {
        const vertices: Vertex2D[] = [];
        for (let p of points) {
            vertices.push(new Vertex2D(p, border));
        }
        vertices.push(new Vertex2D(points[0], border));
        return vertices;
    }

    private static triangularize(points: Complex[]): Triangle[] {
        const triangles: Triangle[] = [];

        const indices: number[] = [];
        for (let i = 0; i < points.length; i++) indices.push(i);

        while (indices.length > 3) {
            const t = Polygon2D.nextEar(points, indices);
            const i = indices.indexOf(t.b);
            indices.splice(i, 1);

            triangles.push(t);
        }
        triangles.push(new Triangle(indices[0], indices[1], indices[2]));
        return triangles;
    }

    private static nextEar(points: Complex[], indices: number[]): Triangle {
        for (let i = 0; i < indices.length; i++) {
            const l = indices[i];
            const m = indices[(i + 1) % indices.length];
            const h = indices[(i + 2) % indices.length];

            const p1 = points[l];
            const p2 = points[m];
            const p3 = points[h];

            const orientation = Polygon2D.orientation(p1, p2, p3);
            if (!orientation) continue;

            if (Polygon2D.triangleIsEmpty(p1, p2, p3, points, indices)) return new Triangle(l, m, h);
        }
        throw Error('No more ears: malformed polygon?');
    }

    private static orientation(p1: Complex, p2: Complex, p3: Complex): boolean {
        return ((p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)) > 0;
    }

    private static triangleIsEmpty(p1: Complex, p2: Complex, p3: Complex,
                                   points: Complex[], indices: number[]): boolean {
        for (let i of indices) {
            if (Polygon2D.triangleContainsPoint(p1, p2, p3, points[i])) return false;
        }
        return true;
    }

    private static triangleContainsPoint(p1: Complex, p2: Complex, p3: Complex, t: Complex): boolean {
        return Polygon2D.orientation(p1, p2, t) && Polygon2D.orientation(p2, p3, t) && Polygon2D.orientation(p3, p1, t);
    }
}

class Triangle {
    constructor(readonly a: number, readonly b: number, readonly c: number) {
    }
}

export class PolygonSpec {
    constructor(
        readonly vertices: Complex[],
        readonly fillColor: Color|undefined,
        readonly borderColor: Color|undefined
    ) {
        if (vertices.length < 3) throw Error('Polygon must have at least 3 vertices');
        if (!fillColor && !borderColor) throw Error('Invisible polygon');
    }
}
import {BufferGeometry, ColorRepresentation, Mesh, MeshBasicMaterial, Vector3} from "three";
import {cylinderMatrix} from "../app/demos/regge/regge2.component";

export class ThickLine {
    mesh: Mesh;

    constructor(
        vertices: Vector3[],
        segments: number,
        color: ColorRepresentation,
    ) {
        const cylinderVertices = [];
        for (let i = 0; i < segments; i++) {
            const c1 = Math.cos(i * Math.PI * 2 / segments);
            const s1 = Math.sin(i * Math.PI * 2 / segments);
            const c2 = Math.cos((i + 1) * Math.PI * 2 / segments);
            const s2 = Math.sin((i + 1) * Math.PI * 2 / segments);
            cylinderVertices.push(new Vector3(-0.5, c1, s1,));
            cylinderVertices.push(new Vector3(-0.5, c2, s2,));
            cylinderVertices.push(new Vector3(+0.5, c2, s2,));
            cylinderVertices.push(new Vector3(+0.5, c2, s2,));
            cylinderVertices.push(new Vector3(+0.5, c1, s1,));
            cylinderVertices.push(new Vector3(-0.5, c1, s1,));
        }

        const points = [];
        for (let i = 0; i < vertices.length - 1; i++) {
            const p1 = vertices[i];
            const p2 = vertices[i + 1];
            const m = cylinderMatrix(p1, p2);
            for (let c of cylinderVertices) {
                points.push(c.clone().applyMatrix4(m));
            }
        }

        const geometry = new BufferGeometry().setFromPoints(points);
        const material = new MeshBasicMaterial({color});

        this.mesh = new Mesh(geometry, material);
    }
}
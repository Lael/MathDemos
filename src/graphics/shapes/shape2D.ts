import {Complex} from "../../math/complex";
import {Color} from "./color";

export class Shape2D {
    protected dirty = true;

    private readonly vao: WebGLVertexArrayObject;
    private readonly vbo: WebGLBuffer;
    private readonly vertexAttribs: VertexAttrib[];

    constructor(protected readonly gl: WebGL2RenderingContext,
                protected readonly vertices: Vertex2D[],
                private readonly drawMode: GLenum) {
        const vao = gl.createVertexArray();
        if (!vao) throw Error('Could not create VAO!');
        this.vao = vao;
        const vbo = gl.createBuffer();
        if (!vbo) throw Error('Could not create VBO!');
        this.vbo = vbo;

        this.vertexAttribs = [
            new VertexAttrib(0, 2, gl.FLOAT, 6*4, 0),
            new VertexAttrib(1, 4, gl.FLOAT, 6*4, 2*4),
        ];

        const data: number[] = [];
        for (let v of this.vertices) v.writeTo(data);

        this.gl.bindVertexArray(this.vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);

        for (let va of this.vertexAttribs) {
            this.gl.enableVertexAttribArray(va.index);
            this.gl.vertexAttribPointer(va.index, va.size, va.type, false, va.stride, va.offset);
        }

        this.gl.bufferData(this.gl.ARRAY_BUFFER, Float32Array.from(data), this.gl.STATIC_DRAW);

        for (let va of this.vertexAttribs) {
            this.gl.disableVertexAttribArray(va.index);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindVertexArray(null);
    }

    draw(): void {
        this.gl.bindVertexArray(this.vao);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);

        for (let va of this.vertexAttribs) {
            this.gl.enableVertexAttribArray(va.index);
        }

        this.gl.drawArrays(this.drawMode, 0, this.vertices.length);

        for (let va of this.vertexAttribs) {
            this.gl.disableVertexAttribArray(va.index);
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindVertexArray(null);
    }
}

export class Vertex2D {
    constructor(private readonly p: Complex, private readonly c: Color) {
    }

    writeTo(data: number[]) {
        data.push(this.p.x);
        data.push(this.p.y);
        data.push(this.c.r);
        data.push(this.c.g);
        data.push(this.c.b);
        data.push(this.c.a);
    }
}

export class VertexAttrib {
    constructor(readonly index: number,
                readonly size: number,
                readonly type: GLenum,
                readonly stride: number,
                readonly offset: number) {}
}

export class Shader {
    private readonly vert: WebGLShader;
    private readonly frag: WebGLShader;
    private readonly program: WebGLProgram;
    private readonly uniformLocations: Map<String, number>;
    private readonly uniformTypes: Map<String, number>;

    constructor(private readonly gl: WebGL2RenderingContext, vertSource: string, fragSource: string) {
        const program = gl.createProgram();
        if (program === null) {
            throw new Error("Shader program is null!");
        }
        this.program = program;

        const vert = gl.createShader(gl.VERTEX_SHADER);
        if (vert === null) {
            throw new Error("Vertex shader is null!");
        }
        gl.shaderSource(vert, vertSource);
        gl.compileShader(vert);
        this.vert = this.buildShader(gl.VERTEX_SHADER, vertSource);
        this.frag = this.buildShader(gl.FRAGMENT_SHADER, fragSource);

        gl.attachShader(this.program, this.vert);
        gl.attachShader(this.program, this.frag);
        gl.linkProgram(this.program);
        gl.useProgram(this.program);

        this.uniformLocations = new Map<String, number>();
        this.uniformTypes = new Map<String, number>();
    }

    static fromPaths(gl: WebGL2RenderingContext, vertPath: string, fragPath: string): Shader {
        const vert = Shader.readShaderSource(vertPath);
        const frag = Shader.readShaderSource(fragPath);
        console.log(vert, frag);
        return new Shader(gl, vert, frag);
    }

    private static readShaderSource(path: string): string {
        let source = '';
        fetch(path).then(async function(response) {
            source = await response.text();
            console.log(source);
        });
        return source;
    }

    private buildShader(type: GLenum, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (shader === null) {
            throw new Error("Vertex shader is null!");
        }
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        return shader;
    }
}
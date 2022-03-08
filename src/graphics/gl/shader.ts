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

        // Check for success
        const linked = gl.getProgramParameter(this.program, gl.LINK_STATUS);
        if (!linked) {
            // There were errors, so get the errors and display them.
            var error = gl.getProgramInfoLog(this.program);
            throw new Error('Failed to link program: ' + error);
            return;
        }
        gl.useProgram(this.program);

        this.uniformLocations = new Map<String, number>();
        this.uniformTypes = new Map<String, number>();
    }

    static fromPaths(gl: WebGL2RenderingContext, vertPath: string, fragPath: string): Promise<Shader> {
        return Shader.readShaderSource(vertPath).then(vert => {
            return Shader.readShaderSource(fragPath).then(frag => {
                return new Shader(gl, vert, frag);
            });
        });
    }

    private static readShaderSource(path: string): Promise<string> {
        return fetch(path).then(response => response.text());
    }

    private buildShader(type: GLenum, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (shader === null) {
            throw new Error("Vertex shader is null!");
        }
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        const message = this.gl.getShaderInfoLog(shader) || '';

        if (message.length > 0) {
            throw new Error('Failed to compile shader: ' + message);
        }
        return shader;
    }
}
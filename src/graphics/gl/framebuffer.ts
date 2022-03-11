import {Texture} from "./texture";

export class Framebuffer {
    private readonly colorTexture: Texture;
    private readonly depthBuffer: WebGLRenderbuffer;
    private readonly framebuffer: WebGLFramebuffer;

    constructor(private readonly gl: WebGL2RenderingContext,
                readonly width: number,
                readonly height: number,
                readonly type: number = gl.FLOAT,
                readonly format: number = gl.RGBA,
    ) {
        this.colorTexture = new Texture(gl, width, height, type, format, null);
        const db = gl.createRenderbuffer();
        if (!db) throw Error('Could not create depth buffer');
        this.depthBuffer = db;
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthBuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);

        const fb = gl.createFramebuffer();
        if (!fb) throw Error('Could not create framebuffer');
        this.framebuffer = fb;

        this.resize(width, height);

        this.bind();
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);
    }

    resize(width: number, height: number) {
        this.colorTexture.resize(width, height);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthBuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
    }

    bind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.depthBuffer);
        this.colorTexture.bind();
    }

    unbind() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.colorTexture.unbind();
    }
}
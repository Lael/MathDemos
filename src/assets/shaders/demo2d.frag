#version 300 es

precision mediump float;

in vec4 vColor;
in vec2 vTexCoord;

uniform int uUseTex;
uniform sampler2D uTex;

out vec4 fragColor;

void main() {
    if (uUseTex != 0) {
        fragColor = texture(uTex, vTexCoord);
    } else {
        fragColor = vColor;
    }
}

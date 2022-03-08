#version 300 es

precision highp float;

layout (location=0) in vec2 lPosition;
layout (location=1) in vec4 lColor;
layout (location=2) in vec2 lTexCoord;

out vec4 vColor;
out vec2 vTexCoord;

uniform mat4 uModel;
uniform mat4 uCamera;

void main() {
    gl_Position = uCamera * uModel * vec4(lPosition, 0.0, 1.0);
    vColor = lColor;
    vTexCoord = lTexCoord;
}

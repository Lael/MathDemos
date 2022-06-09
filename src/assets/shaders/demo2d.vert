#version 300 es

precision highp float;

layout (location=0) in vec2 lPosition;
layout (location=1) in vec4 lColor;

out vec4 vColor;

uniform mat4 uCamera;
uniform mat4 uModel;

void main() {
    gl_Position = uCamera * uModel * vec4(lPosition, 0.0, 1.0);
    vColor = lColor;
}

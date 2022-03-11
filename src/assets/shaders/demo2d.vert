#version 300 es

precision highp float;

layout (location=0) in vec2 lPosition;
layout (location=1) in vec4 lColor;

out vec4 vColor;

uniform mat4 uCamera;

void main() {
    gl_Position = uCamera * vec4(lPosition, 0.0, 1.0);
    vColor = lColor;
}

#version 300 es

precision highp float;

layout (location=0) in vec2 lPosition;

void main() {
    gl_Position = uCamera * vec4(lPosition, 0.0, 1.0);
}
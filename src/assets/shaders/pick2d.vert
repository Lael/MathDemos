#version 300 es

precision highp float;

layout (location=0) in vec2 lPosition;

uniform mat4 uCamera;
uniform mat4 uModel;

void main() {
    gl_Position = uCamera * uModel * vec4(lPosition, 0.0, 1.0);
}
#version 300 es

precision highp float;

uniform vec4 uId;

void main() {
    gl_FragColor = uId;
}
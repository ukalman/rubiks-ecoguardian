uniform float amplitude; // animates the motion of the faces

attribute vec3 customColor; // vert color
attribute vec3 vel; // vertex velocity

varying vec3 vNormal; // vertex direction
varying vec3 vColor; // vertex color

void main() {
    vNormal = normal; // where face is looking at
    vColor = customColor;

    // add velocity to position of vertices
    vec3 newPosition = position + vel * amplitude;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition,1.0);

}
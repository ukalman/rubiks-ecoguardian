// Three js example tessellate modifier
varying vec3 vNormal;
varying vec3 vColor;

void main(){
    const float ambient = 0.4; // non directional light

    vec3 light = vec3(1.0); // directional light (for shadows)
    light = normalize(light);

    // how is directional light pointing to surface (vNormal)
    float directional = max (dot(vNormal,light),0.0);

    // combine directional and nondirectional lighting effects to color of object
    gl_FragColor = vec4 ((directional + ambient) * vColor,1.0);
}
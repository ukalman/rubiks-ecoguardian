
uniform vec3 SpotlightPosition;
uniform vec3 SpotlightDirection;

varying vec3 vSpotlightPosition;
varying vec3 vSpotlightDirection;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
    
    vec4 viewSpotlightPosition = modelViewMatrix * vec4(SpotlightPosition, 1.0);
    vec4 viewSpotlightDirection = modelViewMatrix * vec4(SpotlightDirection, 0.0);

    vSpotlightPosition = viewSpotlightPosition.xyz;
    vSpotlightDirection = normalize(viewSpotlightDirection.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

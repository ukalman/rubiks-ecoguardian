
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vSpotlightPosition;
varying vec3 vSpotlightDirection;

uniform vec3 Ka; 
uniform vec3 Kd; 
uniform vec3 Ks; 
uniform float Shininess; 
uniform vec3 objectColor; // Object color

// Spotlight specific uniforms
uniform float SpotlightCutOff; 
uniform vec3 SpotlightIntensity; 

vec3 calculateSpotlight(vec3 normal, vec3 fragPos) {
    vec3 lightDir = normalize(vSpotlightPosition - fragPos);
    float theta = dot(lightDir, normalize(-vSpotlightDirection));

    // Check if within spotlight cone
    if (theta > SpotlightCutOff) {
        vec3 reflectDir = reflect(-lightDir, normal);
        vec3 viewDir = normalize(-fragPos);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), Shininess);
        float distance = length(vSpotlightPosition - fragPos);
        float attenuation = 1.0 / (distance * distance); 
        vec3 ambient = Ka;
        vec3 diffuse = Kd * max(dot(normal, lightDir), 0.0);
        vec3 specular = Ks * spec;

        // Apply spotlight intensity
        vec3 lighting = (ambient + attenuation * (diffuse + specular)) * SpotlightIntensity;
        return lighting;
    } else {
        return vec3(0.0); // No light contribution if outside the spotlight cone
    }
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 fragPos = vPosition;
    vec3 spotlightColor = calculateSpotlight(normal, fragPos);
    gl_FragColor = vec4(spotlightColor, 1.0) * vec4(objectColor, 1.0);
}

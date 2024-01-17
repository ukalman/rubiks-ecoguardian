precision highp float;


uniform vec2 res;//The width and height of our screen
uniform sampler2D bufferTexture;//Our input texture
uniform vec3 smokeSource;//The x,y are the position. The z is the power/density
// uniform float time;

void main() {
  vec2 pixel = gl_FragCoord.xy / res.xy;
  //Get the distance of the current pixel from the smoke source
  float dist = distance(smokeSource.xy,gl_FragCoord.xy);
  //Get the color of the current pixel
  gl_FragColor = texture2D( bufferTexture, pixel );

  //Generate smoke when mouse is pressed
  gl_FragColor.rgb += smokeSource.z * max(15.0-dist,0.0);

  //Smoke diffuse
  float xPixel = 1.0/res.x;//The size of a single pixel
  float yPixel = 1.0/res.y;
  vec4 rightColor = texture2D(bufferTexture,vec2(pixel.x+xPixel,pixel.y));
  vec4 leftColor = texture2D(bufferTexture,vec2(pixel.x-xPixel,pixel.y));
  vec4 upColor = texture2D(bufferTexture,vec2(pixel.x,pixel.y+yPixel));
  vec4 downColor = texture2D(bufferTexture,vec2(pixel.x,pixel.y-yPixel));
  //Handle the bottom boundary
  if(pixel.y <= yPixel){
    downColor.rgb = vec3(0.0);
  }
      //Diffuse equation
      float factor = 8.0 * 0.016 * (leftColor.r + rightColor.r + downColor.r * 3.0 + upColor.r - 6.0 * gl_FragColor.r);
  
      //Account for low precision of texels
      float minimum = 0.003;
      if(factor >= -minimum && factor < 0.0) factor = -minimum;

      gl_FragColor.rgb += factor;
  
  }
precision highp float;


uniform vec2 res;//The width and height of our screen
uniform sampler2D bufferTexture;//Our input texture
uniform vec3 smokeSource;//The x,y are the posiiton. The z is the power/density
uniform float time;
uniform float smokePointCoefficient;
float dist;

void main() {
  vec2 pixel = gl_FragCoord.xy / res.xy;

  //Get the color of the current pixel
  gl_FragColor = texture2D( bufferTexture, pixel );


  vec2 smokePoint1 = vec2(res.x/2.0 + 100.0 * sin(time * 4.0),res.y/4.0 + 200.0 * tan(time / 4.0));
  dist = distance(smokePoint1,gl_FragCoord.xy);
  gl_FragColor.rgb += 0.01 * max(max(100.0*smokePointCoefficient,0.0) -dist,0.0);

  vec2 smokePoint2 = vec2(res.x/3.0 + 200.0 * cos(time * 5.0 + 0.48),res.y/4.0 + 400.0 * tan(time / 4.0));
  dist = distance(smokePoint2,gl_FragCoord.xy);
  gl_FragColor.rgb += 0.01 * max(max(70.0 * smokePointCoefficient,0.0)-dist,0.0);

  vec2 smokePoint3 = vec2(res.x/4.0 + 100.0 * cos(time * 4.0 + 1.02),res.y/4.0 + 700.0 * tan(time / 4.0));
  dist = distance(smokePoint3,gl_FragCoord.xy);
  gl_FragColor.rgb += 0.01 * max(max(100.0*smokePointCoefficient,0.0)-dist,0.0);

  vec2 smokePoint4 = vec2(res.x/10.0 + 50.0 * sin(time * 5.0),res.y/4.0 + 700.0 * tan(time / 3.0));
  dist = distance(smokePoint4,gl_FragCoord.xy);
  gl_FragColor.rgb += 0.01 * max(max(100.0*smokePointCoefficient,0.0)-dist,0.0);

  vec2 smokePoint5 = vec2(res.x/1.5 + 50.0 * sin(time * 3.0),res.y/4.0 + 700.0 * tan(time / 3.0));
  dist = distance(smokePoint5,gl_FragCoord.xy);
  gl_FragColor.rgb += 0.01 * max(max(200.0*smokePointCoefficient,0.0)-dist,0.0);

  vec2 smokePoint6 = vec2(res.x/1.2 + 50.0 * cos(time * 3.2),res.y/4.0 + 700.0 * tan(time / 4.0));
  dist = distance(smokePoint6,gl_FragCoord.xy);
  gl_FragColor.rgb += 0.01 * max(max(150.0*smokePointCoefficient,0.0)-dist,0.0);

  vec2 smokePoint7 = vec2(res.x + 100.0 * cos(time * 2.0),res.y/4.0 + 700.0 * tan(time / 2.0));
  dist = distance(smokePoint7,gl_FragCoord.xy);
  gl_FragColor.rgb += 0.01 * max(max(150.0*smokePointCoefficient,0.0)-dist,0.0);


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
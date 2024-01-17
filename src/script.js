import "./style.css";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader";
import {TessellateModifier} from "three/examples/jsm/modifiers/TessellateModifier";
import * as dat from "dat.gui";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
import CannonDebugger from 'cannon-es-debugger';

// Shaders
import smokeVertexShader from "./shaders/smokeVertex.glsl";
import smokeFragmentShader from "./shaders/smokeFragment.glsl";
import drawSmokeVertexShader from "./shaders/drawSmokeVertex.glsl";
import drawSmokeFragmentShader from "./shaders/drawSmokeFragment.glsl";
import phongVertexShader from "./shaders/phongVertex.glsl";
import phongFragmentShader from "./shaders/phongFragment.glsl";
import explosionVertexShader from "./shaders/explosionVertex.glsl";
import explosionFragmentShader from "./shaders/explosionFragment.glsl";

// Game Over Div Func
function showGameOver(isWin, pollutionLevel, timeTaken) {
  let message = "";
  if (isWin) {
      message = "The Rubik's Cube destroyed all the evil cubes and saved the Block City! Citizens will be rewarding you.";
  } else {
      message = "The Rubik's Cube unfortunately suffocated to death. You lost.";
  }

  document.getElementById('gameOverMessage').textContent = message;
  document.getElementById('pollutionLevelStat').textContent = "Final Pollution Level: " + pollutionLevel;
  document.getElementById('timeTakenStat').textContent = "Time Taken: " + timeTaken + " seconds";
  document.getElementById('gameOverDiv').style.display = 'block';
}

// IsGameStarted
let isGameStarted = false;
let startTime = 0;
let endTime = 0;

// isLoaded
let isLoaded = false;

// CannonDebugger should render or no
let updateCannonDebugger = false;

// How To Play Texts
const infoRaceAgainstTime = "<b>RACE AGAINST TIME</b><br><br>Your mission is to eliminate 20 evil cubes in the perimeter of the park area, but they must be destroyed in a specific order. <br><br>Dijkstra's Shortest Path algorithm is your guide, leading you to each target through a directive arrow. <br><br>Focus is key: you must precisely target and obliterate only the cube indicated by the arrow before moving to the next for if an evil cube is not pointed by the arrow, it cannot be destroyed. <br><br>Speed and accuracy are essential in this high-stakes operation, where every second counts and every move matters. <br>Good luck hero!";
const infoFindAndDestroy = "<b>FIND AND DESTROY!</b><br><br> Block City faces an imminent threat: 15 evil cubes are dispersed throughout, each a ticking time bomb of pollution, emitting noxious gases that threaten to engulf the city.<br><br> Your critical task: locate and neutralize them swiftly, halting their environmental havoc.<br><br> You receive real-time updates on the identity and proximity of the nearest evil cube. However, this mission tests your navigational prowess – there's no directional aid.<br><br> Rely on your instincts and strategic thinking to uncover these hidden adversaries in the urban labyrinth.  <br>Good luck hero!";
const infoNightFalls = "<b>NIGHT FALLS</b><br><br> Night descends, shrouding Block City in darkness. Your mission is vital: find and neutralize 10 evil cubes, each releasing toxic gases into the night air. <br><br>Your primary tool is a flashlight. But beware, its battery is limited – use it carefully to navigate and reveal hidden dangers.<br><br><b>Hint:</b> The evil cubes are often found in the park area after dark. Find and use the lever on the park wall, a crucial device that activates park spotlights. These are not ordinary lights; they serve as detectors, illuminating and identifying the evil cubes. Once detected, evil cubes will glow, unveiling their positions. <br><br>This mission requires sharp wits and keen eyes in the enveloping darkness. <br>Good luck hero!";
const infoFreeRoam = "<b>FREE ROAM</b><br><br>Do as you want! Here, you are unbound by the constraints of time, objectives, or missions. Experience the city as you wish, navigating its streets and towering skyscrapers at your own pace. Shift between day and night with a simple toggle. Your trusty flashlight, now has unlimited battery life. Feel the thrill of uninterrupted movement with an endless boost feature, allowing you to traverse the city's expanse swiftly. But that's not all – embrace your creative side by spawning a variety of random objects and transform them. Enjoy the freedom, revel in the exploration, and let your imagination guide your journey through this urban wonderland.<br>Have fun, hero!";

const controlsRaceAgainstTimeAndFindAndDestroy = "<b>KEY BINDINGS</b><hr><b>General</b><br>Escape: Pause/Resume Game<br><hr><b>Movement</b><br>W: Move Forward<br>S: Move Backward:<br>A: Move Leftward<br>D: Move Rightward<br>Spacebar: Jump/Float<br>Shift: Move Boosted<hr><b>Camera</b><br>Hold Left Click + Move Mouse: Rotate Camera<br>Hold Right Click + Move Mouse: Move Camera<br>Wheel Up/Down: Zoom In/Out";
const controlsNightFalls = "<b>KEY BINDINGS</b><hr><b>General</b><br>Escape: Pause/Resume Game<br><hr><b>Movement</b><br>W: Move Forward<br>S: Move Backward:<br>A: Move Leftward<br>D: Move Rightward<br>Spacebar: Jump/Float<br>Shift: Move Boosted<hr><b>Camera</b><br>Hold Left Click + Move Mouse: Rotate Camera<br>Hold Right Click + Move Mouse: Move Camera<br>Wheel Up/Down: Zoom In/Out<hr><b>Lights</b><br>F: Toggle Flashlight<br>P: Activate/Deactivate Park Spotlight Lever (if in proximity)";
const controlsFreeRoam = "<b>KEY BINDINGS</b><hr><b>General</b><br>Escape: Pause/Resume Game<br>N: Toggle day/night<br><hr><b>Movement</b><br>W: Move Forward<br>S: Move Backward:<br>A: Move Leftward<br>D: Move Rightward<br>Spacebar: Jump/Float<br>Shift: Move Boosted<hr><b>Camera</b><br>Hold Left Click + Move Mouse: Rotate Camera<br>Hold Right Click + Move Mouse: Move Camera<br>Wheel Up/Down: Zoom In/Out<hr><b>Lights</b><br>F: Toggle Flashlight<br>P: Activate/Deactivate Park Spotlight Lever (if in proximity)<hr><b>Objects</b><br>E: Spawn Random object model<br>Left Click Object: Select<br>Backspace: Deselect the Selected Object<br>Del: Delete the Selected Object<br>X: Apply transform on X axis<br>Y: Apply transform on Y axis<br>Z: Apply transform on Z axis";

function drawSmoke(){
  var smokeScene;
    
  var smokeRenderer;
  var smokeCanvas;
  var smokeCamera;

  function smoke_scene_setup(){
    smokeScene = new THREE.Scene();
    smokeScene.background = null;
    var width = window.innerWidth;
    var height = window.innerHeight;
    // orthographic camera!!! (weird results in perspective camera)
    smokeCamera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );
    smokeCamera.position.z = 2;


    smokeCanvas = document.getElementById("draw-smoke-surface");
    smokeRenderer = new THREE.WebGLRenderer( { canvas: smokeCanvas} );

    smokeRenderer.setSize( window.innerWidth, window.innerHeight );

  }



  smoke_scene_setup();


  var bufferScene;
  var textureA;
  var textureB;
  var bufferMaterial;
  var plane;
  var bufferObject;
  var finalMaterial;
  var quad;

  function buffer_texture_setup(){
    //Create buffer scene
    bufferScene = new THREE.Scene();
    //Create 2 buffer textures
    textureA = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
    textureB = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter} );
    //Pass textureA to shader
    bufferMaterial = new THREE.ShaderMaterial( {
      uniforms: {
        bufferTexture: { type: "t", value: textureA },
        res : {type: 'v2',value:new THREE.Vector2(window.innerWidth,window.innerHeight)},//Keeps the resolution
        smokeSource: {type:"v3",value:new THREE.Vector3(0,0,0)},
        time: {type:"f",value:Math.random()*Math.PI*2+Math.PI}
      },
      fragmentShader: drawSmokeFragmentShader
    } );
    plane = new THREE.PlaneGeometry( window.innerWidth, window.innerHeight );
    bufferMaterial.transparent = true;
    bufferMaterial.opacity = 0.2;
    bufferObject = new THREE.Mesh( plane, bufferMaterial );
    bufferScene.add(bufferObject);

    //Draw textureB to screen 
    finalMaterial =  new THREE.MeshBasicMaterial({map: textureB});
    finalMaterial.transparent = true;
    finalMaterial.opacity = 0.2;

    quad = new THREE.Mesh( plane, finalMaterial );
    smokeScene.add(quad);
  }
  buffer_texture_setup();


    //Send position of smoke source with value
  var mouseDown = false;
  function UpdateMousePosition(X,Y){
    var mouseX = X;
      var mouseY = window.innerHeight - Y;
      bufferMaterial.uniforms.smokeSource.value.x = mouseX;
      bufferMaterial.uniforms.smokeSource.value.y = mouseY;
  }
  document.onmousemove = function(event){
      UpdateMousePosition(event.clientX,event.clientY)
  }

  document.onmousedown = function(event){
    mouseDown = true;
    bufferMaterial.uniforms.smokeSource.value.z = 1;
  }
  document.onmouseup = function(event){
    mouseDown = false;
    bufferMaterial.uniforms.smokeSource.value.z = 0;
  }
  window.addEventListener("resize", () => {
    //Update Size

    smokeCamera.aspect = window.innerWidth/window.innerHeight;
    smokeCamera.updateProjectionMatrix();

    smokeRenderer.setSize(window.innerWidth, window.innerHeight);
    smokeRenderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  });



  const animate = () => {
  

    smokeRenderer.setRenderTarget(textureB);
    smokeRenderer.render(bufferScene,smokeCamera);

    // Swap textureA and B
    var t = textureA;
    textureA = textureB;
    textureB = t;
    quad.material.map = textureB.texture;
    bufferMaterial.uniforms.bufferTexture.value = textureA.texture;

    //Update time
    bufferMaterial.uniforms.time.value += 0.01;

    // Render to the screen without clearing
    smokeRenderer.setRenderTarget(null);
    smokeRenderer.clear(false); // Disable clearing
    smokeRenderer.autoClear = false; // Do not clear automatically
    smokeRenderer.clearDepth(); // Clear only the depth buffer
    smokeRenderer.render(smokeScene, smokeCamera);
  


    if(!isGameStarted){
      window.requestAnimationFrame(animate);
    }

    else {
      smokeCanvas.remove();
    }
    
  };
  animate();
}

drawSmoke();



let gameMode = 'race_against_time';
let gameModeString = "";
function setGameModeString(){
  if(gameMode == 'race_against_time'){
    gameModeString = "Race Against Time";
  } else if(gameMode == 'find_and_destroy'){
    gameModeString = "Find and Destroy!";
  } else if(gameMode == 'night_falls'){
    gameModeString = "Night Falls";
  } else if(gameMode == 'free_roam'){
    gameModeString = "Free Roam";
  } 

}
setGameModeString();
const diffbar= document.getElementById('difficulty-bar');
diffbar.style.display='block';
diffbar.innerHTML = "Selected Game Mode: "+gameModeString;


let scores = [];
const progressBar = document.getElementById('progress-bar');
function saveScores() {
  localStorage.setItem('scores', JSON.stringify(scores));
}

function loadScores() {
  const storedScores = localStorage.getItem('scores');
  if (storedScores) {
    scores = JSON.parse(storedScores);
  }
}

document.addEventListener('DOMContentLoaded', loadScores);
document.getElementById('quitButton').addEventListener('click', function() {

  var exit = confirm('Are you sure you want to quit the game?');
  if (exit) {

    window.close();

    if (!window.closed) {
      window.location.href = 'about:blank'; 
    }
  }
});

document.getElementById('playButton').addEventListener('click', function() {

  console.log('Oyun başlatıldı');
  isGameStarted = true;

  document.getElementById('mainMenu').style.display = 'none';
  if(progressBar.value!==100){
    document.getElementById('loadingScreen').style.display = 'flex';

  }
  setGameModeString();
  diffbar.innerHTML = "Playing Game Mode: "+gameModeString;

  initializeGame();

  

});

document.getElementById('restart').addEventListener('click', function() {

  window.location.reload();
});

document.getElementById('optionsButton').addEventListener('click', function() {
  const optionsMenu = document.getElementById('optionsMenu');

  document.getElementById('playButton').style.display = 'none';
  document.getElementById('quitButton').style.display = 'none';
  document.getElementById('title').style.display = 'none';
 

  this.style.display = 'none';
  if (optionsMenu.style.display === 'none') {
    optionsMenu.style.display = 'block';
  } else {
    optionsMenu.style.display = 'none';

  }
});

document.getElementById('optionsMenu').addEventListener('click', (event) => {
  if (event.target.classList.contains('difficulty-button')) {
    gameMode = event.target.getAttribute('data-difficulty');
    console.log('Selected game mode:', gameMode); 
    setGameModeString();
    diffbar.innerHTML = "Selected Game Mode: "+gameModeString;
    document.getElementById('optionsMenu').style.display = 'none';


    document.getElementById('title').style.display = 'block';
    document.getElementById('playButton').style.display = 'block';
    document.getElementById('optionsButton').style.display = 'block';
    document.getElementById('quitButton').style.display = 'block';
  }
});

document.querySelectorAll('.difficulty-button').forEach(button => {
  button.addEventListener('click', function() {
    const difficulty = this.getAttribute('data-difficulty');

    console.log('Seçilen zorluk: ' + difficulty);
 
  });
});
document.getElementById('backButton').addEventListener('click', function() {

  document.getElementById('optionsMenu').style.display = 'none';


  document.getElementById('title').style.display = 'block';
  document.getElementById('playButton').style.display = 'block';
  document.getElementById('optionsButton').style.display = 'block';
  document.getElementById('quitButton').style.display = 'block';

});

function initializeGame(){

  let isGamePaused = false;


  function pauseGame() {
    isGamePaused = true;

    document.getElementById('pause').style.display = 'block';

  }

  function resumeGame() {
    isGamePaused = false;

    document.getElementById('pause').style.display = 'none';

  }


  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      if (!isGamePaused) {
        pauseGame();
      } else {
        resumeGame();
      }
    }
  });




  const canvas = document.getElementById("game-surface");

  // Create the Physics World
  const physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.81, 0)
  }); 
  const timeStep = 1 / 20;

  // Scene
  const scene = new THREE.Scene();

  // CannonDebugger
  var cannonDebugger;

  // const cannonDebugger = new CannonDebugger(scene,physicsWorld);

  let isTimerStarted;

  let isNight = false;
  // flashlight battery bar container
  const batteryBarContainer = document.getElementById('flashlightBatteryContainer');
  //batteryBar.style.width = this.flashlightBattery + '%';
  if(gameMode == 'night_falls'){
    isNight = true;
    batteryBarContainer.style.display = "block";
  }
  let isFlashlightActive = false;




  // RubiksCube Class

  class RubiksCube {
    constructor(model, mixer, animationsMap, orbitControl, thirdPersonCam) {
        this.model = model;
        this.mixer = mixer;
        this.animationsMap = animationsMap;
        this.orbitControl = orbitControl;
        this.camera = thirdPersonCam;
        this.currentAction = 'Idle';
        this.isBoosted = 'false';
        this.flashlightBattery = 100;
        this.flashlightBatteryDrainRate = 0.8; // Battery drain per second
        this.distanceElement = document.getElementById('distanceDisplay');
        this.evilCubeCountElement = document.getElementById('evilCubeCountDisplay');
        if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
          this.distanceElement.style.display = "block";
        }
        if(gameMode != 'free_roam'){
          this.evilCubeCountElement.style.display = "block";
          if(gameMode == 'race_against_time'){
            this.evilCubeCountElement.style.top = "10px";
          }
        }

        // Flashlight
        // Define the spotlight
        this.flashlight = new THREE.SpotLight(0xffffff, 1); // White light with full intensity
        this.flashlight.angle = Math.PI / 5; // Narrow beam
        //flashlight.penumbra = 0.1; // Soft edge of the light
        this.flashlight.decay = 0; // Light decay
        this.flashlight.distance = 100; // Maximum distance of light
        this.flashlight.position.z = 1;
        this.flashlight.position.y = 0;

        if(isNight && isFlashlightActive){
          scene.add(this.flashlight);
        }
      
        this.moveDirection = new THREE.Vector3();
        this.rotateAngle = new THREE.Vector3(0,1,0);
        this.rotateQuaternion = new THREE.Quaternion();
        this.cameraTarget = new THREE.Vector3();

        // constants
        this.fadeDuration = 0.2;
        this.runVelocity = 40; // 50 idi
        this.walkVelocity = 20;

        this.boostBar = 100; // Boost bar's maximum value
        this.boostDecreaseRate = 2; // The amount of boost to decrease per frame when boosted
        this.boostRecoveryRate = 1;
        this.boostAvailable = true;

        // spawnPoint
        this.spawnPoint = new CANNON.Vec3(0,0,0);
        
        if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
          this.spawnPoint = new CANNON.Vec3(480,0,530);
        }


      // rigidbody
      const rubiksCubeBody = new CANNON.Body({
        mass: 15,
        shape: new CANNON.Box(new CANNON.Vec3(2,2,2)), 
        position: this.spawnPoint
      });
      this.rigidbody = rubiksCubeBody;
      physicsWorld.addBody(rubiksCubeBody);

      this.rigidbody.addEventListener('collide',(e)=>{
        if(e.body.id != 0){
          if(e.body.type != CANNON.Body.STATIC){
            console.log("Collision with an evil cube!");

            console.log(e.body);

            this.collideWith(evilCubesSpecific.get(e.body.id));
          }
          

        }
    
      });

    }


    update(frameTime, keysPressed, delta) {

      if(isGamePaused!==true ){
        const distAndId = this.calculateDistanceToClosestEvilCube();
        if(distAndId){
          this.updateDistanceDisplay(distAndId[0],distAndId[1]);
        }

        if(isNight){
          if(lever){
            if(this.checkIfInProximityOfLever(lever)){
              document.getElementById('leverMessage').style.display = "block";
            } else {
              document.getElementById('leverMessage').style.display = "none";
            }
          }
          
        }
       

        this.updateEvilCubeCountDisplay(evilCubeCount);
        
        this.updateFlashlight(frameTime);

        // Update the Rubik's cube's state, animation, and progression toward the solution
        const directions = ['w','a','s','d'];
        const space = [' '];
        const shiftKey = ['shift'];
        const directionPressed = directions.some(key => keysPressed[key] == true);
        const spacePressed = space.some(key => keysPressed[key] == true);
        const shiftPressed = shiftKey.some(key => keysPressed[key] == true);

        var play = 'Idle';
        if(directionPressed){
          play = 'MoveForward';
          this.runVelocity = 40;
          if(shiftPressed && this.boostBar >0 && this.boostAvailable ){
            play = 'MoveForwardBoosted'; // yeni


            this.isBoosted=true;
            this.runVelocity +=0.1; // 1.1'di
            if(gameMode != 'free_roam'){
              this.boostBar = Math.max(this.boostBar - this.boostDecreaseRate , 0);
            }
            
            if (this.boostBar <= 0) {
              this.boostAvailable = false;
              this.isBoosted=false;// Disable boost once the bar reaches 0
            }

          }
          else {

              this.isBoosted = false;

            this.boostBar = Math.min(this.boostBar + this.boostRecoveryRate, 100);
            if (this.boostBar >= 30) {
              this.boostAvailable = true; // Re-enable boost once the bar reaches 20%
            }

          }
        }





        if(spacePressed){
          play = 'Jump';
          if(directionPressed){
            play = 'JumpWhileMove';
          }
        }

        if(this.currentAction != play){
  
          const toPlay = this.animationsMap.get(play);
          const current = this.animationsMap.get(this.currentAction);


          current.fadeOut(this.fadeDuration);
          toPlay.reset().fadeIn(this.fadeDuration).play();

          this.currentAction = play;
        }

        this.mixer.update(frameTime);

        if(this.currentAction == 'MoveForward' || this.currentAction == 'JumpWhileMove' || this.currentAction == 'MoveForwardBoosted' || this.currentAction === 'Jump'){
          // calculate towards camera direction
          // angle between the camera view and the character
          if (!isTimerStarted && gameMode == 'race_against_time' ) {
            startTimer();
            isTimerStarted = true;
            timerElement.style.display='block';


          }
          var angleYCameraDirection = Math.atan2(
              (this.camera.position.x - this.model.position.x),
              (this.camera.position.z - this.model.position.z)
          );

          // diagonal movement angle offset
          var directionOffset = this.directionOffset(keysPressed);

          // rotate model
          // make the model rotate towards that direction stepwise
          this.rotateQuaternion.setFromAxisAngle(this.rotateAngle, angleYCameraDirection + directionOffset);
          this.model.quaternion.rotateTowards(this.rotateQuaternion, 0.2);
          // This part is important, just trying something
          this.rigidbody.quaternion.copy(this.model.quaternion);

          // calculate direction
          // based on the previously calculated angles, we calculated the vector which represents the direction into which the model must move
          this.camera.getWorldDirection(this.moveDirection)
          this.moveDirection.y = 0;
          this.moveDirection.normalize();
          this.moveDirection.applyAxisAngle(this.rotateAngle,directionOffset);


          // boost/normal velocity
          const velocity = this.isBoosted ? this.runVelocity : this.walkVelocity;

          // move model & camera
          const moveX = this.moveDirection.x * velocity * frameTime;
          const moveZ = this.moveDirection.z * velocity * frameTime;

          this.rigidbody.position.x += moveX;
          this.rigidbody.position.z += moveZ;

          if(this.currentAction === 'JumpWhileMove' || this.currentAction === 'Jump'){
            const moveY = new THREE.Vector3(0.0,1.0,0.0).y * frameTime * velocity;

            this.rigidbody.position.y += moveY;
          }


          this.updateModelPosition();
          this.updateCameraTarget(moveX, moveZ);

          this.updateBoostBarDisplay(this.boostBar);



      }else{
          this.boostBar = Math.min(this.boostBar + this.boostRecoveryRate , 100);
          this.updateBoostBarDisplay(this.boostBar);
        }

      }

    }



    updateCameraTarget(moveX, moveZ) {

      if(isGamePaused!==true){

        // move camera
        this.camera.position.x += moveX;
        this.camera.position.z += moveZ;

        // update camera target
        this.cameraTarget.x = this.model.position.x;
        this.cameraTarget.y = this.model.position.y + 1;
        this.cameraTarget.z = this.model.position.z;
        this.orbitControl.target = this.cameraTarget;

      }

    }

    updateModelPosition(){
      if(isGamePaused!==true){
      this.model.position.copy(this.rigidbody.position);
      this.model.quaternion.copy(this.rigidbody.quaternion);
      }
    }

    updateFlashlight(frameTime){
      // Update Flashlight
      const batteryBar = document.getElementById('flashlightBatteryBar');
      batteryBar.style.width = this.flashlightBattery + '%';

      if(this.flashlightBattery > 50) {
          batteryBar.style.backgroundColor = '#4CAF50'; // Green
      } else if(this.flashlightBattery > 20) {
          batteryBar.style.backgroundColor = '#FFEB3B'; // Yellow
      } else {
          batteryBar.style.backgroundColor = '#F44336'; // Red
      }

      this.flashlight.position.copy(this.model.position);
      this.flashlight.target.position.copy(this.model.position.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(this.model.quaternion)));
      this.flashlight.target.updateMatrixWorld();
      

      if (isFlashlightActive) {
        console.log("FLASHLIGHT ACTIVE!");
        console.log("FLASHLIGHT BATTERY: ");
        console.log(this.flashlightBattery);
        if(gameMode == 'night_falls'){
          this.flashlightBattery -= this.flashlightBatteryDrainRate * frameTime;
          this.flashlightBattery = Math.max(0, this.flashlightBattery); // Prevent battery from going negative
        }

        
        
        // Update flashlight intensity based on battery level
        if (this.flashlightBattery > 0) {
          this.flashlight.intensity = 1; // Full intensity
        } else {
          this.flashlight.intensity = 0; // Turn off the flashlight
        }

        
       
      }
      
      
    }

    updateBoostBarDisplay(boostValue) {
      const boostBarElement = document.getElementById('boostBar');
      boostBarElement.style.width = boostValue + '%';

      if (boostValue > 60) {
        boostBarElement.style.backgroundColor = 'green';
      } else if (boostValue > 30 && boostValue <= 60) {
        boostBarElement.style.backgroundColor = 'yellow';
      } else {
        boostBarElement.style.backgroundColor = 'red';
      }
    }

    directionOffset(keysPressed){

      var directionOffset = 0; // w

      if(keysPressed.w){
        if (keysPressed.a){
          directionOffset = Math.PI / 4 // w + a
        } else if (keysPressed.d){
          directionOffset = - Math.PI / 4 // w + d
        }
      } else if (keysPressed.s){
        if (keysPressed.a){
          directionOffset = Math.PI / 4 + Math.PI / 2 // s + a
        } else if(keysPressed.d) {
          directionOffset = -Math.PI / 4 - Math.PI / 2 // s + d
        } else {
          directionOffset = Math.PI // s
        }
      } else if (keysPressed.a) {
        directionOffset = Math.PI / 2 // a
      } else if (keysPressed.d) {
        directionOffset = - Math.PI/2; // d
      }
      
      return directionOffset;
    
    }

  

    collideWith(evilCube) {

      const velocity = this.isBoosted ? this.runVelocity : this.walkVelocity;
      const momentum = this.rigidbody.mass * velocity; // Implement a function to calculate damage
      if(velocity >= this.runVelocity){
        if(cubeGraph){
          if(evilCubes.get(cubeGraph.targetCubeKey)===evilCube){

            evilCube.receiveDamage(momentum);
    
          }
        }
        else {
            evilCube.receiveDamage(momentum);
        }
        

      }

    }
    
    calculateDistanceToClosestEvilCube(){
      if(evilCubesSpecific.size > 0){
        var closestEvilCubeId = -1;
        var distToClosest = 10000;
        evilCubesSpecific.forEach((evilCube, rigidbodyid) => {
          const dist = Math.sqrt((this.model.position.x - evilCube.model.position.x) ** 2 + (this.model.position.z - evilCube.model.position.z) ** 2 + (this.model.position.y - evilCube.model.position.y) ** 2);
          if(dist < distToClosest){
            distToClosest = dist;
            closestEvilCubeId = rigidbodyid;
          }
        });
        return [distToClosest, closestEvilCubeId];
      } 
     
  
    }

    updateDistanceDisplay(distance, evilCubeId) {
      
      this.distanceElement.textContent = `Closest evil cube - ID: ${evilCubeId} Distance: ${distance.toFixed(2)} meters`;
    }

    updateEvilCubeCountDisplay(count){
      this.evilCubeCountElement.textContent = `Alive Evil Cube Count: ${count}`;
    }
    checkIfInProximityOfLever(leverModel){
      const dist = Math.sqrt((this.model.position.x - leverModel.position.x) ** 2 + (this.model.position.z - leverModel.position.z) ** 2 + (this.model.position.y - leverModel.position.y) ** 2);
      if(dist <= 6){
        return true;
      } return false;

    }

    getRandomValue(min, max) {
      return Math.random() * (max - min) + min;
    }

    // 6 Random Models
    spawnRandomObject(){
      const index = Math.round(this.getRandomValue(0,5));

      const randomModel = randomModels[index];
      let randomModelCopy = SkeletonUtils.clone(randomModel);
      let randomModelNameCopy = "" + randomModelNames[index];

      randomModelCopy.position.x = this.model.position.x + 5;
      randomModelCopy.position.y = this.model.position.y + 2;
      randomModelCopy.position.z = this.model.position.z + 5;

      randomObjects.push(randomModelCopy);
      randomObjectNames.push(randomModelNameCopy);
      console.log("random objects: ");
      console.log(randomObjects);
      scene.add(randomModelCopy);
     
    
    }
    
    static initializeRubiksCube(model, mixer, animationsMap, orbitControl, thirdPersonCam){
      return new RubiksCube(model, mixer, animationsMap, orbitControl, thirdPersonCam);
    }
    
    
  }


  // Oxygen Level
  var oxygenLevel;
  // Pollution Level
  var pollutionLevel = 0.0;
  const pollutionBarContainer = document.getElementById('pollutionBarContainer');
  if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
    console.log("YESES, GÖRÜNÜR YAP!");
    pollutionBarContainer.style.display = "block";
  }
  // Evil Cube Class
  var evilCubes = new Map();
  var evilCubesSpecific = new Map();
  class EvilCube {
    constructor(model, spawnOnlyAtPark = false) {
      this.model = model;

      this.currentAction = 'Idle';
      this.tag = 'EvilCube';
      this.health = this.getRandomValue(100,400); // a value between 100 and 200
      this.isDead = false;
      this.originalMaterial = this.model.getObjectByName('Cube_1').material;
      this.receivedDamage = false;
      this.carbonEmissionRate =  0.000005 * (this.health * 0.01);
      if(gameMode == 'find_and_destroy' || gameMode == 'free_roam' || gameMode == 'night_falls'){
        this.model.scale.x = this.getRandomValue(1,3);
        this.model.scale.y = this.getRandomValue(1,3);
        this.model.scale.z = this.getRandomValue(1,3);
      }
      
      

      this.willExplode = false;


      this.spawnOnlyAtPark = spawnOnlyAtPark;
     
      

      // constants
      this.walkVelocity = 10;

      
      let spawnPoint;
      if(gameMode == 'race_against_time'){
        spawnPoint = new CANNON.Vec3(this.getRandomValue(-80,285),4,this.getRandomValue(-150,10));
      } else if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
        // take a random spawn point
        let spawnPointIndex;
        if(this.spawnOnlyAtPark){
          spawnPointIndex = Math.round(this.getRandomValue(0,74));
          spawnPoint = parkSpawnPoints[spawnPointIndex];
        } else {
          spawnPointIndex = Math.round(this.getRandomValue(0,269));
          spawnPoint = citySpawnPoints[spawnPointIndex];
        }

        var spawnPoint_X = spawnPoint[0];
        var spawnPoint_Y = spawnPoint[1];
        var spawnPoint_Z = spawnPoint[2];
        spawnPoint = new CANNON.Vec3(spawnPoint_X,spawnPoint_Y,spawnPoint_Z);
      }
      
      const scale_x = 3 * this.model.scale.x;
      const scale_y = 2 * this.model.scale.y;
      const scale_z = 2 * this.model.scale.z;

      // let explosionGeometry = new THREE.BoxGeometry(scale_x,scale_y,scale_z);
      let explosionGeometry = new THREE.BoxGeometry(40,40,40);
      // TessellateModifier(max edge lenght - size of triangles, maxa iterations)
      const tessellateModifier = new TessellateModifier(1,40);
      console.log("tessellate modifier tamam: ");
      console.log(tessellateModifier);
      explosionGeometry = tessellateModifier.modify(explosionGeometry);
      console.log("explosion geometry tamam: ");
      console.log(explosionGeometry);
      const numFaces = explosionGeometry.attributes.position.count / 3;
      const colors = new Float32Array(numFaces *3 *3); // color of each face (number of faces * 3 points * 3(RGB)) 
      const vel = new Float32Array(numFaces * 3 * 3); // color of each face (number of faces * 3 points * 3(XYZ))

      const color = new THREE.Color();
      const l = 0.5; // lightness
      const s = 1.0; // saturation

      for(let f = 0; f < numFaces; f++){
        const index = 9 * f; // 3 points * [x, y, z] per triangle face

        const h = 0.5 + Math.random(0.5); // hue
        color.setHSL(h,s,l);

        // velocity of points of face
        let dirX = Math.random() * 2 -1;
        let dirY = Math.random() * 2 -1;
        let dirZ = Math.random() * 2 -1;

        for(let i=0; i < 3; i++){ // for 3 points of a triangle

          // give vertices of each face a color
          colors[index + (3*i)] = 0.0;
          colors[index + (3*i) + 1] = 0.0;
          colors[index + (3*i) + 2] = 0.0;

          // give vertices of each face a random velocity
          vel[index + (3*i)] = dirX;
          vel[index + (3*i) + 1] = dirY;
          vel[index + (3*i) + 2] = dirZ;
        }

      }

      explosionGeometry.setAttribute('customColor',new THREE.BufferAttribute(colors,3));
      explosionGeometry.setAttribute('vel', new THREE.BufferAttribute(vel,3));

      this.explosionUniforms = {
        amplitude: {value: 0.0}
      }

      const explosionShaderMaterial = new THREE.ShaderMaterial( {
        uniforms: this.explosionUniforms,
        vertexShader: explosionVertexShader,
        fragmentShader: explosionFragmentShader
      });

      this.explosionMesh = new THREE.Mesh(explosionGeometry, explosionShaderMaterial);



      const massVal = (scale_x + scale_y + scale_z) / 7; 
      // rigidbody
      const evilCubeBody = new CANNON.Body({
        mass: massVal,
        shape: new CANNON.Box(new CANNON.Vec3(scale_x,scale_y,scale_z)), 
        position: spawnPoint

      });
      this.rigidbody = evilCubeBody;
      physicsWorld.addBody(evilCubeBody);

      evilCubes.set(this.rigidbody.id, this);
      evilCubesSpecific.set(this.rigidbody.id, this);


    }


    receiveDamage(momentum) {
      this.receivedDamage = true;
      console.log("Gelen momentum: ");
      console.log(momentum);

      const damageFactor = 0.065; 
      const damage = Math.floor(momentum * damageFactor);
      this.health -= damage;
      this.health = Math.max(0, this.health);

      console.log("Received damage, damage is: " + damage);
      console.log("New value of health: " + this.health);


    }

    update(frameTime){
      if(isGamePaused!==true) {
        this.updateModelPosition();
        // this.emitCarbonGas();
        if (this.health <= 0) {
          if(!this.willExplode){
            this.explodePrepare();
          }
          this.willExplode = true;
          // this.explode();
          if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
            // evilCubes.delete(this.rigidbody.id);
            evilCubesSpecific.delete(this.rigidbody.id);
          }
          this.destroyEvilCube();
          evilCubeCount--;
          
      
        }
        if(spotlightsOpen && isNight){
          this.changeMaterial();
        }
       
        
        if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
          this.emitCarbonGas();
          if(!this.receivedDamage){
            this.wanderBehavior(frameTime);
          }
        }
        
        
        
        
      }
    }

    updateModelPosition(){
      if(isGamePaused!==true){
       
      
        this.model.position.copy(this.rigidbody.position);
        this.model.quaternion.copy(this.rigidbody.quaternion);
      
        
      }
    }

    changeMaterial(){
      if((this.rigidbody.position.x >= -60 && this.rigidbody.position.x <= 65) && (this.rigidbody.position.z >= -40 && this.rigidbody.position.z <= -15)){
        this.model.getObjectByName('Cube_1').material = grassMaterial1;
      } else if((this.rigidbody.position.x >= -40 && this.rigidbody.position.x <= 76) && (this.rigidbody.position.z >= -110 && this.rigidbody.position.z <= -95)){
        this.model.getObjectByName('Cube_1').material = grassMaterial2;
      } else if((this.rigidbody.position.x >= 162 && this.rigidbody.position.x <= 280) && (this.rigidbody.position.z >= -34 && this.rigidbody.position.z <= -18)){
        this.model.getObjectByName('Cube_1').material = grassMaterial3;
      } else if((this.rigidbody.position.x >= 200 && this.rigidbody.position.x <= 245) && (this.rigidbody.position.z >= -122 && this.rigidbody.position.z <= -96)){
        this.model.getObjectByName('Cube_1').material = grassMaterial4;
      }
    }

    changeToOriginalMaterial(){
      this.model.getObjectByName('Cube_1').material = this.originalMaterial;
    }

    // WANDER BEHAVIOR
    wanderBehavior(frameTime){
      const randVal1 = this.getRandomValue(0, 1000);
      if (randVal1 > 950) { // Reduced frequency of direction change
          const moveX = this.getRandomValue(-5, 5);
          const moveZ = this.getRandomValue(-5, 5);
  
   
          const moveDirection = new THREE.Vector3(moveX, 0, moveZ);
          const moveAmount = moveDirection.multiplyScalar(this.walkVelocity * frameTime);
        
          this.rigidbody.position.x += moveAmount.x;
          this.rigidbody.position.z += moveAmount.z;
  
          // Update rigidbody's quaternion to match new direction
          if (moveDirection.length() > 0) {
            const newQuaternion = new THREE.Quaternion();
            newQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), moveDirection);
            this.rigidbody.quaternion.copy(newQuaternion);
          }
      }
    }


    emitCarbonGas(){

      this.carbonEmissionRate = 0.000005 * (this.health * 0.01);
      pollutionLevel += this.carbonEmissionRate;
      this.updatePollutionBar();
    }

    explodePrepare(){
      this.explosionMesh.position.copy(this.rigidbody.position);
      this.explosionMesh.quaternion.copy(this.rigidbody.quaternion);
      scene.add(this.explosionMesh);
      
    }

    explode(){
      this.explosionUniforms.amplitude.value += 1.0;
    }

    updatePollutionBar() {
      const pollutionBar = document.getElementById('pollutionBar');
  
      // Calculate width percentage
      // Calculate width percentage (max value is 2)
      const widthPercentage = (pollutionLevel / 2) * 100;
      pollutionBar.style.width = widthPercentage + '%';

      // Change color based on pollution level
      if (pollutionLevel <= 1) {
          pollutionBar.style.backgroundColor = 'green';
      } else if (pollutionLevel <= 1.5) {
          pollutionBar.style.backgroundColor = 'gray';
      } else {
          pollutionBar.style.backgroundColor = 'darkred';
      }
  }

    updateExplosionMesh(){
      this.explode();
    }

    getRandomValue(min, max) {
      return Math.random() * (max - min) + min;
    }

    static initializeEvilCube(model, spawnOnlyAtPark){
      return new EvilCube(model, spawnOnlyAtPark);
    }

    destroyEvilCube(){

      this.isDead=true;

      physicsWorld.removeBody(this.rigidbody);
      scene.remove(this.model);
    
    }

  }


  const gates = {
    gateA: { model: { position: new THREE.Vector3(113.2, -0.00001, 0.285) }, edges: [{ target: 'gateB' }, { target: 'gateH' }] },
    gateB: { model: { position: new THREE.Vector3(-64.076, -0.00001, -1.4555) }, edges: [{ target: 'gateC' }] },
    gateC: { model: { position: new THREE.Vector3(-73.97, -0.00001, -69.25) }, edges: [{ target: 'gateD' }] },
    gateD: { model: { position: new THREE.Vector3(-64.15, -0.00001, -136.661) }, edges: [{ target: 'gateE' }] },
    gateE: { model: { position: new THREE.Vector3(117.054, -0.00001, -160.90) }, edges: [{ target: 'gateF' }] },
    gateF: { model: { position: new THREE.Vector3(291.585, -0.00001, -136.986) }, edges: [{ target: 'gateG' }] },
    gateG: { model: { position: new THREE.Vector3(307.799, -0.00001, -67.2525) }, edges: [ { target: 'gateH' }] },
    gateH: { model: { position: new THREE.Vector3(290.586, -0.00001, -1.085) }},
    gateI: { model: { position: new THREE.Vector3(115.35, -0.00001, -37.32) }, edges: [ { target: 'gateA' },{ target: 'gateJ' },{ target: 'gateL' }] },
    gateJ: { model: { position: new THREE.Vector3(87.025, -0.00001, -65.3939) }, edges: [ { target: 'gateK' },{ target: 'gateC' }] },
    gateK: { model: { position: new THREE.Vector3(115.087, -0.00001, -95.517) }, edges: [ { target: 'gateE' },{ target: 'gateL' }] },
    gateL: { model: { position: new THREE.Vector3(146.598, -0.00001, -65.2525) }, edges: [ { target: 'gateG' }] }
  };
  
  
  // CubeGraph Class
  class CubeGraph {
    constructor(cubes, playerCube, scene) {
      this.cubes = new Map(cubes); // All evil cubes
      this.playerCube = playerCube; // The player cube
      this.scene = scene; // Reference to the Three.js scene
      this.arrowHelper = this.createArrowHelper();
      this.scene.add(this.arrowHelper);
      this.graph = new Graph();
      this.buildGraph();
      this.path = [];
      this.currentTargetIndex = 0;
      this.targetCubeKey=0;
      this.score=0;
  
  
  
  
    }
  
    buildGraph() {
  
  
  
      for (const gateName in gates) {
        const gate = gates[gateName];
  
        this.graph.addNode(gate);
  
      }
  
      for (const gateName in gates) {
        const gate = gates[gateName];
  
        if (gate.edges) {
          gate.edges.forEach(edge => {
            const targetGate = gates[edge.target];
            const distance = gate.model.position.distanceTo(targetGate.model.position);
            this.graph.addEdge(gate, targetGate, distance);
  
          });
        }
      }
  
      console.log("buildgraphsize: "+this.graph.nodes.size);
  
  
  
    }
  
    calculatePath() {
  
  

      this.targetCubeKey = Array.from(this.cubes.keys())[this.cubes.size - 1];
      const targetCube = this.cubes.get(this.targetCubeKey);
  
  
  
  
      this.graph.addNode(targetCube);
  
  
    
      const startCube = { model: { position: this.playerCube.model.position.clone() } };
      this.graph.addNode(startCube);
  
  
  
      const distance = startCube.model.position.distanceTo(targetCube.model.position);

      const allowedGates = ['gateC', 'gateE', 'gateG', 'gateA','gateI','gateJ','gateK','gateL'];
  
      if (((this.isInsidePark(startCube) === true ) && (this.isInsidePark(targetCube)=== true)) ||
          ((this.isInsidePark(startCube)=== false) && (this.checkArrowInsidePark(startCube,targetCube))===false)) {
  
        console.log("istisna durum");
  
        const distanceToStartCubeTarget = startCube.model.position.distanceTo(targetCube.model.position);
  
        this.graph.addEdge(startCube, targetCube, distanceToStartCubeTarget);

        this.path = this.graph.dijkstra(startCube, targetCube);
      }
      else {
  
        let addedGatesCount = 0;
        const maxAllowedGates = 5; 

        const nearestGatesToStartCube = this.findNearestGates(startCube);
  
        nearestGatesToStartCube.forEach(gate => {
  
          if (addedGatesCount < maxAllowedGates) {
   
  
  
  
          const gateKey = Object.keys(gates).find(key => gates[key] === gate);
          if(this.isInsidePark(startCube)===true){
  
  
            if (allowedGates.includes(gateKey)) {
  
              const distanceToTargetCube = startCube.model.position.distanceTo(gate.model.position);
              this.graph.addEdge(startCube, gate, distanceToTargetCube);
              console.log("start cube içerdeyken izin verilen kapılar"+ gateKey);
              addedGatesCount++;
            }
  
  
          }
          else{
                if(!this.checkArrowInsidePark(startCube,gate)){
                  const distanceToStartCube = startCube.model.position.distanceTo(gate.model.position);
                  this.graph.addEdge(startCube, gate, distanceToStartCube);
                  console.log("start cube dışardayken izin verilen kapılar"+ gateKey);
                  addedGatesCount++;
                }
          }
          }
        });
  
        const nearestGatesToTargetCube = this.findNearestGates(targetCube);
  
        let addedGatesCount2 = 0;
        const maxAllowedGates2 = 3;
  
        nearestGatesToTargetCube.forEach(gate => {
  
  
          const gateKey = Object.keys(gates).find(key => gates[key] === gate);
  
          if (addedGatesCount2 < maxAllowedGates) {
          if(this.isInsidePark(targetCube)===true){
  
  
            if (allowedGates.includes(gateKey)) {
  
              const distanceToTargetCube = targetCube.model.position.distanceTo(gate.model.position);
              this.graph.addEdge(targetCube, gate, distanceToTargetCube);
              console.log("target cube içerdeyken izin verilen kapılar"+ gateKey);
              addedGatesCount2++;
            }
  
  
          }
          else{
            if(!this.checkArrowInsidePark(targetCube,gate)){
              const distanceToStartCube = targetCube.model.position.distanceTo(gate.model.position);
              this.graph.addEdge(targetCube, gate, distanceToStartCube);
              console.log("target cube dışardayken izin verilen kapılar"+ gateKey);
              addedGatesCount2++;
            }
          }
          }
        });
  
  
     
        this.path = this.graph.dijkstra(startCube, targetCube);
      }
  
      this.currentTargetIndex = 0;
      console.log("graph size: " + this.graph.nodes.size);
      console.log("path size: " + this.path.length);
    }
  
  
  
    update() {
  
      if (timeLeft<=0 ) {
        console.log("ZAMAN BİTTİ!!!!");
        rubiksCube.evilCubeCountElement.style.display = "none";
        endGame(this.score);
        
  
      }
  
  
  
 
  
      const currentTargetCube = this.path[this.currentTargetIndex];
      this.updateArrowDirection(currentTargetCube);
  
      const distanceToTarget = this.playerCube.model.position.distanceTo(currentTargetCube.model.position);
      if (distanceToTarget < 15.0 && this.currentTargetIndex !== this.path.length-1) {
        console.log(evilCubes.get(this.targetCubeKey).isDead);
  
        this.currentTargetIndex++;
  
      }
      if(this.currentTargetIndex === this.path.length-1 && (this.cubes.get(this.targetCubeKey).isDead)===true) {
  
        this.score+=10;
        console.log("Son hedefe ulaşıldı.");
        this.currentTargetIndex=0;
        console.log("hedef küp sayısı"+this.cubes.size);
  
        this.graph.removeNode(this.playerCube);
  
        this.cubes.delete(this.targetCubeKey);
        if (this.cubes.size===0 ) {
  
          endGame(this.score);
  
        }
        else{
          this.calculatePath();
        }
  
        console.log("yeni graph size"+this.graph.nodes.size);
        console.log("yeni küp sayısı"+this.cubes.size);
  
      }
    }
  
  
    createArrowHelper() {
      // Create an ArrowHelper with an initial dummy direction and add it to the scene
      const arrowDir = new THREE.Vector3(0, 1, 0);
      const arrowPos = this.playerCube.model.position;
      const arrowColor = 0xff0000;
      const arrowLength = 4;
      return new THREE.ArrowHelper(arrowDir, arrowPos, arrowLength, arrowColor);
    }
  
    checkArrowInsidePark(cube, gate) {

      const cubeX1 = cube.model.position.x;
      const cubeZ1 = cube.model.position.z;
      const cubeX2 = gate.model.position.x;
      const cubeZ2 = gate.model.position.z;
  
  
  
      const edges = [
        { x3: gates.gateH.model.position.x, y3: gates.gateH.model.position.z, x4: gates.gateF.model.position.x, y4: gates.gateF.model.position.z },
        { x3: gates.gateH.model.position.x, y3: gates.gateH.model.position.z, x4: gates.gateB.model.position.x, y4: gates.gateB.model.position.z },
        { x3: gates.gateB.model.position.x, y3: gates.gateB.model.position.z, x4: gates.gateD.model.position.x, y4: gates.gateD.model.position.z },
        { x3: gates.gateD.model.position.x, y3: gates.gateD.model.position.z, x4: gates.gateF.model.position.x, y4: gates.gateF.model.position.z }
      ];
  
  
  
  
      for (let edge of edges) {
        if (this.findLineCollision(cubeX1, cubeZ1, cubeX2, cubeZ2, edge.x3, edge.y3, edge.x4, edge.y4)) {
          return true; 
        }
      }
      return false;
    }
  
    findLineCollision(x1, y1, x2, y2, x3, y3, x4, y4) {
      var a1 = y2 - y1;
      var b1 = x1 - x2;
      var c1 = a1 * x1 + b1 * y1;
      var a2 = y4 - y3;
      var b2 = x3 - x4;
      var c2 = a2 * x3 + b2 * y3;
      var det = a1 * b2 - a2 * b1;
      if (det !== 0) {
        var x = (b2 * c1 - b1 * c2) / det;
        var y = (a1 * c2 - a2 * c1) / det;
        if (x >= Math.min(x1, x2) && x <= Math.max(x1, x2) &&
            x >= Math.min(x3, x4) && x <= Math.max(x3, x4) &&
            y >= Math.min(y1, y2) && y <= Math.max(y1, y2) &&
            y >= Math.min(y3, y4) && y <= Math.max(y3, y4)) {
          return true;
        }
      }
      return false;
    }
  
    isInsidePark(targetCube) {
  
  
      const minX = Math.min(gates.gateB.model.position.x, gates.gateF.model.position.x);
      const maxX = Math.max(gates.gateB.model.position.x, gates.gateF.model.position.x);
      const minZ = Math.min(gates.gateB.model.position.z, gates.gateF.model.position.z);
      const maxZ = Math.max(gates.gateB.model.position.z, gates.gateF.model.position.z);
  

      const targetX = targetCube.model.position.x;
      const targetZ = targetCube.model.position.z;
  
 
      return targetX >= minX && targetX <= maxX && targetZ >= minZ && targetZ <= maxZ;
    }
  
    findNearestGates(cube, numberOfGates = 6) {
      let gateDistances = [];
  
      for (const gateName in gates) {
        const gate = gates[gateName];
        const distance = cube.model.position.distanceTo(gate.model.position);
        gateDistances.push({ gate: gate, distance: distance });
      }
  

      gateDistances.sort((a, b) => a.distance - b.distance);
      return gateDistances.slice(0, numberOfGates).map(item => item.gate);
    }
  
  
    findKeyOfTargetCube(evilCubes, targetCube) {
      for (let [key, evilCube] of evilCubes.entries()) {
        if (evilCube.model.position.equals(targetCube.model.position)) {
          return key;
        }
      }
      return null; 
    }
  
  
    updateArrowDirection(currentTargetCube) {

      const direction = new THREE.Vector3().subVectors(currentTargetCube.model.position, this.playerCube.model.position).normalize();
  

      const arrowPosition = this.playerCube.model.position.clone();
      arrowPosition.y += 2;
  

      this.arrowHelper.position.copy(arrowPosition);
      this.arrowHelper.setDirection(direction);
  

      const arrowLength = this.playerCube.model.position.distanceTo(currentTargetCube.model.position);
      const headLength = arrowLength * 0.2;
      const headWidth = headLength * 0.5;
  
      this.arrowHelper.setLength(arrowLength, headLength, headWidth);
    }
  
  
 
  }
  
  
  class Graph {
    constructor() {
      this.nodes = new Map(); 
    }
  
    addNode(node) {
      if (!this.nodes.has(node)) {
        this.nodes.set(node, new Map());
      }
    }
  
    addEdge(node1, node2, weight) {
      if (!this.nodes.has(node1) || !this.nodes.has(node2)) {
        throw new Error('Node does not exist');
      }
      this.nodes.get(node1).set(node2, weight);
      this.nodes.get(node2).set(node1, weight); 
    }
  
    removeNode(node) {
      if (!this.nodes.has(node)) return;
  
  
      for (let neighbor of this.nodes.get(node).keys()) {
        this.nodes.get(neighbor).delete(node);
      }
  
  
  
    
      this.nodes.delete(node);
    }
  
    dijkstra(startNode, targetNode) {
      let distances = new Map();
      let previous = new Map();
      let pq = new PriorityQueue();
      let path = []; 
      let smallest;
  
   
      this.nodes.forEach((_, node) => {
        if (node === startNode) {
          distances.set(node, 0);
          pq.enqueue(node, 0);
        } else {
          distances.set(node, Infinity);
        }
        previous.set(node, null);
      });
  
  
      while (!pq.isEmpty()) {
        smallest = pq.dequeue();
  
        if (smallest === targetNode) {
      
          while (previous.get(smallest)) {
            path.push(smallest);
            smallest = previous.get(smallest);
          }
          break; 
        }
  
        if (smallest && distances.get(smallest) !== Infinity) {
          for (let [neighbor, weight] of this.nodes.get(smallest)) {
            let candidate = distances.get(smallest) + weight;
  
            if (candidate < distances.get(neighbor)) {
              distances.set(neighbor, candidate);
              previous.set(neighbor, smallest);
              pq.enqueue(neighbor, candidate);
            }
          }
        }
      }
  
      return path.concat(smallest).reverse(); 
    }
  }
  
  class PriorityQueue {
    constructor() {
      this.values = [];
    }
  
    enqueue(val, priority) {
      this.values.push({ val, priority });
      this.sort();
    }
  
    dequeue() {
      return this.values.shift().val;
    }
  
    isEmpty() {
      return this.values.length === 0;
    }
  
    sort() {
      this.values.sort((a, b) => a.priority - b.priority);
    }
  }
  



  function endGame(score) {

    if(gameMode == 'race_against_time'){
      console.log("Oyun bitti. Skorunuz: "+score );
      scores.push({score});
      console.log("scores durumu da bu: ");
      console.log(scores);

      updateScoreboard();
      isGamePaused=true;



     
    }
    
  }



  document.getElementById('howToPlayButton').addEventListener('click', function() {
   
    pauseGame();
    document.getElementById('howToPlayPopup').style.display = 'block';
    document.getElementById('infoTab').click(); 
    var infoText;
    var controlsText;
    if(gameMode == 'race_against_time'){
      infoText = infoRaceAgainstTime;
      controlsText = controlsRaceAgainstTimeAndFindAndDestroy;
    } else if(gameMode == 'find_and_destroy'){
      infoText = infoFindAndDestroy;
      controlsText = controlsRaceAgainstTimeAndFindAndDestroy;
    } else if(gameMode == 'night_falls'){
      infoText = infoNightFalls;
      controlsText = controlsNightFalls;
    } else if(gameMode == 'free_roam'){
      infoText = infoFreeRoam;
      controlsText = controlsFreeRoam;
    }
    document.getElementById('infoContent').innerHTML = infoText;
    document.getElementById('controlsContent').innerHTML = controlsText;
    document.getElementById('closePopup').innerHTML = 'Resume';
  });
  
  // Tab switching logic
  document.getElementById('infoTab').addEventListener('click', function() {
    document.getElementById('infoContent').style.display = 'block';
    document.getElementById('controlsContent').style.display = 'none';
    this.classList.add('active-tab');
    document.getElementById('controlsTab').classList.remove('active-tab');
  });
  
  document.getElementById('controlsTab').addEventListener('click', function() {
    document.getElementById('infoContent').style.display = 'none';
    document.getElementById('controlsContent').style.display = 'block';
    this.classList.add('active-tab');
    document.getElementById('infoTab').classList.remove('active-tab');
  });
  
  document.getElementById('closePopup').addEventListener('click', function() {
    document.getElementById('howToPlayPopup').style.display = 'none';
    resumeGame();
  });



  function updateScoreboard() {
    scores.sort((a, b) => b.score - a.score); //
  

    const scoreList = document.getElementById('scoreList');
    scoreList.innerHTML = ''; 

    let isUserScorePrinted = false;

    var count = 0;

    for (let i = 0; i < scores.length; i++)  { 
      if(count <= 10){
         if(scores[i].score == null){
           scores.splice(i,1);
         }
        if (scores[i].score) { 
          
          console.log("scores[i]: ");
          console.log(scores[i]);
          let isUserScore = !isUserScorePrinted && scores[i].score === cubeGraph.score;
          if (isUserScore) {
            isUserScorePrinted = true;
          }
  
          const listItem = document.createElement('li');
          listItem.innerHTML = `
                    <span class="rank">
                        <i class="fas fa-medal"></i>${count}
                    </span>
                    
                    <span class="score">${isUserScore ? `Your score` : ""} ${scores[i].score}</span>
                    <span class="stars">
                        ${'<i class="fas fa-star"></i>'.repeat(5)}
                    </span>
                `;
          scoreList.appendChild(listItem);
          count++;
        }
      } else break;
      
    }
    saveScores(); // Skorları kaydet
    document.getElementById('leaderboard').style.display = 'block';
  }


  let timeLeft = 250; 

  const timerElement = document.getElementById('timer'); 
  function startTimer() {

    let checkInterval = 5; 
    let elapsedSeconds = 0; 
    let previousDistanceToTarget = null; 

    const timerId = setInterval(() => {
      if(!isGamePaused){
        elapsedSeconds += 1; 
        timeLeft -= 1; 
        timerElement.textContent = `Remaining Time: ${timeLeft} `;
  
        // Her 3 saniyede bir kontrol yap
        if(gameMode == 'race_against_time'){
          if (elapsedSeconds % checkInterval === 0) {
            const currentTarget = cubeGraph.path[cubeGraph.currentTargetIndex];
            const currentDistanceToTarget = cubeGraph.playerCube.model.position.distanceTo(currentTarget.model.position);
      
     
            if ( currentDistanceToTarget > previousDistanceToTarget) {
              console.log("Hedefe yaklaşılmıyor, yol yeniden hesaplanıyor...");
      
      
              cubeGraph.calculatePath();
            }
      

            previousDistanceToTarget = currentDistanceToTarget;
          }
        }
        
  

        if (timeLeft <= 0) {
          rubiksCube.evilCubeCountElement.style.display = "none";
          clearInterval(timerId);
          endGame(cubeGraph.score); 
        }
      }

    }, 1000); // Her 1 saniyede bir tekrarla
  }


  // CONTROL KEYS
  const keysPressed = { };
  document.addEventListener('keydown',(e)=>{
    keysPressed[e.key.toLowerCase()] = true;
  }, false);

  document.addEventListener('keyup',(e)=>{
    keysPressed[e.key.toLowerCase()] = false;
  }, false);





  // LoadingManager, put it in the textureloader
  const loadingManager = new THREE.LoadingManager();
  loadingManager.onStart = function () {
    console.log("EVET BAŞLADI");
    document.getElementById('loadingScreen').style.display = 'flex';
  };

  loadingManager.onProgress = function (url,loaded,total){
    console.log("ON PROGRESS...");
    progressBar.value=(loaded / total )* 100;
  }

  loadingManager.onLoad = function () {
    

    isLoaded = true;
    if (startTime === 0) {
      // Record the start time when animate is first called
      startTime = Date.now();
    } 
    console.log("ON LOAD...");
    if(progressBar.value===100){
      document.getElementById('loadingScreen').style.display = 'none';
    }


    if(evilCubes.size===20){
      console.log("aga game mode şu: " + gameMode);
      if(gameMode == 'race_against_time'){
        cubeGraph = new CubeGraph(evilCubes, rubiksCube, scene);
        cubeGraph.calculatePath();
      }
 

    }
    

  };

  loadingManager.onError = function () {
    console.log('Yükleme sırasında bir hata oluştu');
  };


  const textureLoader = new THREE.TextureLoader(loadingManager);


  //GLTFLoader
  const gltfLoader = new GLTFLoader(loadingManager);
  //DRACOLoader
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  gltfLoader.setDRACOLoader(dracoLoader);

  //GUI
  // const gui = new dat.GUI();

  // Spherical Environment Map
  var city_envTexture;
  if(isNight){
    city_envTexture = textureLoader.load("/assets/skybox/spherical_skybox_night.png");
  } else {
    city_envTexture = textureLoader.load("/assets/skybox/spherical_skybox_day.jpg");
  }




  var geometry = new THREE.SphereGeometry( 1000, 500, 40 );
  geometry.scale( - 1, 1, 1 );

  var material = new THREE.MeshBasicMaterial( {
    map: city_envTexture
  } );

  const mesh = new THREE.Mesh( geometry, material );

  scene.add( mesh );

  

  // Static Rigid Bodies
  function addStaticRigidBodies(){
    // Ground Rigid Body
    const groundBody = new CANNON.Body({
      shape: new CANNON.Plane(), // infinite plane in the ground
      type: CANNON.Body.STATIC // mass = 0
    });
    physicsWorld.addBody(groundBody);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0,-4.5,0);

    // PARK
    // Park Ground
    const parkGroundBody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(222,1,112)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(112,-3,-68)
    });
    physicsWorld.addBody(parkGroundBody);

    // Park Buildings
    const parkRestaurantBody= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(23.5,14,19)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(176,0,-108)
    });
    physicsWorld.addBody(parkRestaurantBody);

    const parkCafeBody= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15.4,14,19)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(265,0,-108)
    });
    physicsWorld.addBody(parkCafeBody);

    // Bamboo Houses
    const parkbambooHouse1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(6,12,7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(74,0,-32)
    });
    physicsWorld.addBody(parkbambooHouse1Body);

    const parkbambooHouse2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(6,12,7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(45,0,-20)
    });
    physicsWorld.addBody(parkbambooHouse2Body);

    const parkbambooHouse3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(6,12,7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(14,0,-32)
    });
    physicsWorld.addBody(parkbambooHouse3Body);

    const parkbambooHouse4Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(6,12,7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-15,0,-20)
    });
    physicsWorld.addBody(parkbambooHouse4Body);

    const parkbambooHouse5Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(6,12,7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-40,0,-32)
    });
    physicsWorld.addBody(parkbambooHouse5Body);

    // Park Fountain
    const parkFountainBody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(7,12,7.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(115,0,-69)
    });
    physicsWorld.addBody(parkFountainBody);

    // Park Tables
    const parkTable1= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(3,2,3.7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(129,-2,-69.2)
    });
    physicsWorld.addBody(parkTable1);

    const parkTable2= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(3,2,3.7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(100,-2,-69.2)
    });
    physicsWorld.addBody(parkTable2);

    const parkTable3= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(3,2,3.7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(124,-2,-78.7)
    });
    physicsWorld.addBody(parkTable3);

    const parkTable4= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(3,2,3.7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(124,-2,-60)
    });
    physicsWorld.addBody(parkTable4);

    const parkTable5= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(3,2,3.7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(104,-2,-78.7)
    });
    physicsWorld.addBody(parkTable5);

    const parkTable6= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(3,2,3.7)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(104,-2,-60)
    });
    physicsWorld.addBody(parkTable6);

    const parkTable7= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(3.7,2,2.4)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(114.4,-2,-55)
    });
    physicsWorld.addBody(parkTable7);

    const parkTable8= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(3.7,2,2.4)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(114.4,-2,-84)
    });
    physicsWorld.addBody(parkTable8);




    // Park Walls
    // Large Walls
    const parkWall1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(76,14,1.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(13.5,6,-2.5)
    });
    physicsWorld.addBody(parkWall1Body);

    const parkWall2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(76,14,1.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(213.5,6,-2.5)
    });
    physicsWorld.addBody(parkWall2Body);

    const parkWall3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(76,14,1.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(13.5,6,-135)
    });
    physicsWorld.addBody(parkWall3Body);

    const parkWall4Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(76,14,1.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(213.5,6,-135)
    });
    physicsWorld.addBody(parkWall4Body);

    // Medium Walls
    const parkMediumWall1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1.5,14,28)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-61.5,6,-28)
    });
    physicsWorld.addBody(parkMediumWall1Body);

    const parkMediumWall2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1.5,14,28)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-61.5,6,-109.4)
    });
    physicsWorld.addBody(parkMediumWall2Body);

    const parkMediumWall3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1.5,14,28)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(288.6,6,-28)
    });
    physicsWorld.addBody(parkMediumWall3Body);

    const parkMediumWall4Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1.5,14,28)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(288.6,6,-109.4)
    });
    physicsWorld.addBody(parkMediumWall4Body);

    // Small Walls
    const parkSmallWall1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1.5,14,9)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(89,6,-11)
    });
    physicsWorld.addBody(parkSmallWall1Body);

    const parkSmallWall2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1.5,14,9)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(138.5,6,-11)
    });
    physicsWorld.addBody(parkSmallWall2Body);

    const parkSmallWall3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1.5,14,9)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(89,6,-126.5)
    });
    physicsWorld.addBody(parkSmallWall3Body);

    const parkSmallWall4Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1.5,14,9)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(138.5,6,-126.5)
    });
    physicsWorld.addBody(parkSmallWall4Body);




    // Block 1 
    // Ground Rigid Body
    const block1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(222,1,50)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(112,-3,-280)
    });
    physicsWorld.addBody(block1Body);

    // Block 1 Buildings
    const block1house1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(18,14,32)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-66,0,-276)
    });
    physicsWorld.addBody(block1house1Body);

    const block1house2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(20,30,31)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(23,0,-278)
    });
    physicsWorld.addBody(block1house2Body);

    const block1house3BodyPart1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(14,14,36)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(98,0,-279)
    });
    physicsWorld.addBody(block1house3BodyPart1);

    const block1house3BodyPart2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(36,14,12)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(120,0,-302.2)
    });
    physicsWorld.addBody(block1house3BodyPart2);

    const block1house4BodyPart1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(36,14,12)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(194,0,-254)
    });
    physicsWorld.addBody(block1house4BodyPart1);

    const block1house4BodyPart2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(14,14,36)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(216,0,-279)
    });
    physicsWorld.addBody(block1house4BodyPart2);

    const block1house5Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(22,14,32)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(290,0,-278)
    });
    physicsWorld.addBody(block1house5Body);


    // Block 2 Rigid Body
    const block2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(222,1,50)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(112,-3,-428)
    });
    physicsWorld.addBody(block2Body);

    // Block 2 Buildings
    const block2house1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,20)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-82.5,0,-414)
    });
    physicsWorld.addBody(block2house1Body);

    const block2house2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(6,8,13)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-67,0,-418)
    });
    physicsWorld.addBody(block2house2Body);

    const block2house3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,20)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-50,0,-414)
    });
    physicsWorld.addBody(block2house3Body);

    const block2house4BodyPart1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(8,14,22)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(12.5,0,-420)
    });
    physicsWorld.addBody(block2house4BodyPart1);

    const block2house4BodyPart2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(22,14,9)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(27,0,-434)
    });
    physicsWorld.addBody(block2house4BodyPart2);

    const block2house5BodyPart1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(8,14,22)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(100,0,-424)
    });
    physicsWorld.addBody(block2house5BodyPart1);

    const block2house5BodyPart2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(21.3,14,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(113.3,0,-438)
    });
    physicsWorld.addBody(block2house5BodyPart2);

    const block2house6BodyPart1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(8,14,22)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(158,0,-424)
    });
    physicsWorld.addBody(block2house6BodyPart1);

    const block2house6BodyPart2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(21.3,14,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(171.3,0,-438)
    });
    physicsWorld.addBody(block2house6BodyPart2);

    const block2house7 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(10,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(213.6,0,-416.5)
    });
    physicsWorld.addBody(block2house7);

    const block2house8 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(10,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(272.5,0,-411)
    });
    physicsWorld.addBody(block2house8);

    const block2house9 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(10,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(308,0,-411)
    });
    physicsWorld.addBody(block2house9);

    // Refuges
    const refuge1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,2,50)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-159,-2,-426)
    });
    physicsWorld.addBody(refuge1);

    const refuge2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,2,51)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-159,-2,-278.5)
    });
    physicsWorld.addBody(refuge2);

    const refuge3 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,2,44)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-159,-2,-137)
    });
    physicsWorld.addBody(refuge3);

    const refuge4 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,2,44)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-159,-2,0)
    });
    physicsWorld.addBody(refuge4);

    const refuge5 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,2,182)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-159,-2,272)
    });
    physicsWorld.addBody(refuge5);

    const refuge6 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(100,2,1)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-11,-2,500)
    });
    physicsWorld.addBody(refuge6);

    const refuge7 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(100,2,1)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(238,-2,500)
    });
    physicsWorld.addBody(refuge7);

    const refuge8 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(63,2,1)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(443.5,-2,500)
    });
    physicsWorld.addBody(refuge8);

    // Road Obstacles
    const obstacle1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,3,6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-89.6,-2,-335.4)
    });
    physicsWorld.addBody(obstacle1);

    const obstacle2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,3,6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-92.8,-2,-347)
    });
    physicsWorld.addBody(obstacle2);

    const obstacle3 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,3,6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-96,-2,-359)
    });
    physicsWorld.addBody(obstacle3);

    const obstacle4 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,3,6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-99.2,-2,-371)
    });
    physicsWorld.addBody(obstacle4);

    const obstacle5 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,4,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-370,-2,-195.6)
    });
    physicsWorld.addBody(obstacle5);

    const obstacle6 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,4,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-376,-2,-215.6)
    });
    physicsWorld.addBody(obstacle6);

    const obstacle7 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,4,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-644,-2,-195.6)
    });
    physicsWorld.addBody(obstacle7);

    const obstacle8 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,4,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-650,-2,-215.6)
    });
    physicsWorld.addBody(obstacle8);

    const obstacle9 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,4,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-367.4,-2,58)
    });
    physicsWorld.addBody(obstacle9);

    const obstacle10 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,4,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-373.4,-2,78)
    });
    physicsWorld.addBody(obstacle10);

    const obstacle11 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,4,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-642,-2,58)
    });
    physicsWorld.addBody(obstacle11);

    const obstacle12 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,4,8)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-648,-2,78)
    });
    physicsWorld.addBody(obstacle12);


    // Block 3 Rigid Body
    const block3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(100,1,78)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-10,-3,170)
    });
    physicsWorld.addBody(block3Body);

    // Block 3 Buildings
    const block3restaurant1Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(43.5,18,32)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-48,0,140)
    });
    physicsWorld.addBody(block3restaurant1Body);

    // Fence
      const block3fence1body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(15,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(10,2,118.8)
      });
      physicsWorld.addBody(block3fence1body);

      const block3fence2body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(15,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(10,2,165.3)
      });
      physicsWorld.addBody(block3fence2body);


    const block3restaurant2Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(27,14,33)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(48,0,141)
    });
    physicsWorld.addBody(block3restaurant2Body);

    const block3cafeBody= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(21,14,22.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-69,0,210)
    });
    physicsWorld.addBody(block3cafeBody);

    const block3house1Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15,14,22.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-21,0,209)
    });
    physicsWorld.addBody(block3house1Body);

    const block3house2Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15,14,22.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(19.5,0,209)
    });
    physicsWorld.addBody(block3house2Body);

    const block3house3Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15,14,22.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(59.5,0,209)
    });
    physicsWorld.addBody(block3house3Body);



    // Block 4 Rigid Body
    const block4Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(98,1,78)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(236,-3,170)
    });
    physicsWorld.addBody(block4Body);

    // Block 4 Dirt Ground
    const block4dirtGroundBody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(78,2,59.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(236,-1,168.4)
    });
    physicsWorld.addBody(block4dirtGroundBody);

    // Block 4 Buildings
    const block4house1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(295.5,0,206.5)
    });
    physicsWorld.addBody(block4house1Body);
    block4house1Body.quaternion.setFromEuler(0, -Math.PI/8,0);

    const block4house2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(170,0,168)
    });
    physicsWorld.addBody(block4house2Body);

    const block4house3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(209.5,0,130)
    });
    physicsWorld.addBody(block4house3Body);

    const block4house4Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(291.5,0,132)
    });
    physicsWorld.addBody(block4house4Body);
    block4house4Body.quaternion.setFromEuler(0, Math.PI/8, 0);

    const block4house5Part1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(10.5,18,32)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(256.5,0,149.5)
    });
    physicsWorld.addBody(block4house5Part1);
    block4house5Part1.quaternion.setFromEuler(0, Math.PI/7, 0);

    const block4house5Part2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11.3,18,29)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(250,0,176)
    });
    physicsWorld.addBody(block4house5Part2);
    block4house5Part2.quaternion.setFromEuler(0, 2.58 * Math.PI/4, 0);





    // Block 5 Rigid Body
    const block5Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(100,1,78)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-10,-3,374)
    });
    physicsWorld.addBody(block5Body);

    // Block 5 Buildings
    const block5house1Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(16.5,14,29)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(56.4,0,340)
    });
    physicsWorld.addBody(block5house1Body);

      // Fence
      const block5fence1body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(17,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(24,2,318.4)
      });
      physicsWorld.addBody(block5fence1body);

      const block5fence2body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(17,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(24,2,364.6)
      });
      physicsWorld.addBody(block5fence2body);


    const block5house2Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(16.5,14,29)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-9,0,340)
    });
    physicsWorld.addBody(block5house2Body);

    const block5house3Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(16.5,14,29)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-75,0,340)
    });
    physicsWorld.addBody(block5house3Body);

      // Fence
      const block5fence3body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(17,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(-42,2,318.4)
      });
      physicsWorld.addBody(block5fence3body);

      const block5fence4body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(17,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(-42,2,364.6)
      });
      physicsWorld.addBody(block5fence4body);

    const block5house4Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15.5,14,22.4)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(58.4,0,414.4)
    });
    physicsWorld.addBody(block5house4Body);

      // Fence
      const block5fence5body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(19,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(25,2,399)
      });
      physicsWorld.addBody(block5fence5body);

      const block5fence6body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(19,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(25,2,431.6)
      });
      physicsWorld.addBody(block5fence6body);

    const block5house5Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15.5,14,22.4)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-8,0,414.4)
    });
    physicsWorld.addBody(block5house5Body);

      // Fence
      const block5fence7body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(19,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(-42,2,399)
      });
      physicsWorld.addBody(block5fence7body);

      const block5fence8body= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(19,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(-42,2,431.6)
      });
      physicsWorld.addBody(block5fence8body);



    const block5house6Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15.5,14,22.4)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-75,0,414.4)
    });
    physicsWorld.addBody(block5house6Body);





    // Block 6 Rigid Body
    const block6Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(98,1,78)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(236,-3,374)
    });
    physicsWorld.addBody(block6Body);

    // Block 6 Buildings
    const block6house1Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15.5,14,22.4)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(173,0,335.5)
    });
    physicsWorld.addBody(block6house1Body);

    const block6house2Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(15.5,14,22.4)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(173,0,413.4)
    });
    physicsWorld.addBody(block6house2Body);

      // Fence
      const block6fencebody= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(18,5,1)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(206,2,316.4)
      });
      physicsWorld.addBody(block6fencebody);


    const block6restaurantBody= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(44.5,16,40)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(267.6,0,353.5)
    });
    physicsWorld.addBody(block6restaurantBody);

      // Restaurant Sign 
      const block6restaurantSign= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(1,22,1.6)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(211.9,4,420.5)
      });
      physicsWorld.addBody(block6restaurantSign);

      // Restaurant Tables
      const block6restaurantTable1= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(5,2,4)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(237,-2,427.2)
      });
      physicsWorld.addBody(block6restaurantTable1);

      const block6restaurantTable2= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(5,2,4)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(237,-2,407)
      });
      physicsWorld.addBody(block6restaurantTable2);

      const block6restaurantTable3= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(5,2,4)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(257,-2,427.2)
      });
      physicsWorld.addBody(block6restaurantTable3);

      const block6restaurantTable4= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(5,2,4)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(257,-2,407)
      });
      physicsWorld.addBody(block6restaurantTable4);

      const block6restaurantTable5= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(5,2,4)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(277,-2,427.2)
      });
      physicsWorld.addBody(block6restaurantTable5);

      const block6restaurantTable6= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(5,2,4)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(277,-2,407)
      });
      physicsWorld.addBody(block6restaurantTable6);

      const block6restaurantTable7= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(5,2,4)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(296,-2,427.2)
      });
      physicsWorld.addBody(block6restaurantTable7);

      const block6restaurantTable8= new CANNON.Body({
        shape: new CANNON.Box(new CANNON.Vec3(5,2,4)), 
        type: CANNON.Body.STATIC, // mass = 0
        //y'si 3 olcak
        position: new CANNON.Vec3(296,-2,407)
      });
      physicsWorld.addBody(block6restaurantTable8);



    // Block 7 (MudLand) Rigid Body
    const mudlandBody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(62,1,466)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(444,-3,-14)
    });
    physicsWorld.addBody(mudlandBody);

    // MudMountain Body
    const mudMountainBody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(50,70,520)), 
      type: CANNON.Body.STATIC // mass = 0
    });
    physicsWorld.addBody(mudMountainBody);
    mudMountainBody.quaternion.setFromEuler(0, 0, Math.PI / 2);
    mudMountainBody.position.set(574,20,40);

    // MudLand Fence Body
    const mudlandFenceBody= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(60,28,1)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(464,2,448)
    });
    physicsWorld.addBody(mudlandFenceBody);

    // Block 8 Rigid Body
    const block8Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(223,1,126)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-430,-3,-354)
    });
    physicsWorld.addBody(block8Body);

    // Block 8 Buildings
    const block8apartment1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-270,80,-288)
    });
    physicsWorld.addBody(block8apartment1Body);

    const block8apartment2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-270,80,-436)
    });
    physicsWorld.addBody(block8apartment2Body);

    const block8apartment3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-374,80,-288)
    });
    physicsWorld.addBody(block8apartment3Body);

    const block8apartment4Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-374,80,-436)
    });
    physicsWorld.addBody(block8apartment4Body);

    const block8apartment5Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-478,80,-288)
    });
    physicsWorld.addBody(block8apartment5Body);

    const block8apartment6Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-478,80,-436)
    });
    physicsWorld.addBody(block8apartment6Body);

    const block8apartment7Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-582,80,-288)
    });
    physicsWorld.addBody(block8apartment7Body);

    const block8apartment8Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-582,80,-436)
    });
    physicsWorld.addBody(block8apartment8Body);



    // Block 9 Rigid Body
    const block9Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(55,1,113)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-262,-3,-69)
    });
    physicsWorld.addBody(block9Body);

    // Block 9 Buildings
    const block9apartmentBodyPart1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,84)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-270,80,-68)
    });
    physicsWorld.addBody(block9apartmentBodyPart1);

    const block9apartmentBodyPart2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,40)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-274,80,-68)
    });
    physicsWorld.addBody(block9apartmentBodyPart2);

    const block9apartmentBodyPart3 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,22)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-258,80,-68)
    });
    physicsWorld.addBody(block9apartmentBodyPart3);



    // Block 10 Rigid Body
    const block10Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(144,1,113)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-508,-3,-69)
    });
    physicsWorld.addBody(block10Body);

    // Dirt Land Fences
    const dirtLandFence1Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,5,78.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-496,2,-69.4)
    });
    physicsWorld.addBody(dirtLandFence1Body);

    const dirtLandFence2Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,5,31)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-388,3,-21)
    });
    physicsWorld.addBody(dirtLandFence2Body);

    const dirtLandFence3Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(1,5,31)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-388,3,-114)
    });
    physicsWorld.addBody(dirtLandFence3Body);

    const dirtLandFence4Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(55,5,1)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-441,3,-145)
    });
    physicsWorld.addBody(dirtLandFence4Body);

    const dirtLandFence5Body= new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(55,5,1)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-441,3,10)
    });
    physicsWorld.addBody(dirtLandFence5Body);

    // Block 10 Buildings
    const block10house1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-530,0,-29.5)
    });
    physicsWorld.addBody(block10house1Body);
    block10house1Body.quaternion.setFromEuler(0, Math.PI/7, 0);

    // Block 10 Buildings
    const block10house2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-586,0,-6)
    });
    physicsWorld.addBody(block10house2Body);
    block10house2Body.quaternion.setFromEuler(0, Math.PI/2.3, 0);

    const block10house3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-625,0,-50)
    });
    physicsWorld.addBody(block10house3Body);
    block10house3Body.quaternion.setFromEuler(0, Math.PI/3.7, 0);

    const block10house4Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-610,0,-132)
    });
    physicsWorld.addBody(block10house4Body);
    block10house4Body.quaternion.setFromEuler(0, -Math.PI/4.5, 0);

    const block10house5Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(11,14,14.6)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-538,0,-128)
    });
    physicsWorld.addBody(block10house5Body);
    block10house5Body.quaternion.setFromEuler(0, -Math.PI/11, 0);



    // Block 11 Rigid Body
    const block11Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(55,1,113)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-262,-3,203)
    });
    physicsWorld.addBody(block11Body);

    // Block 11 Buildings
    const block11apartmentbody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(45,60,90)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-262,54,204)
    });
    physicsWorld.addBody(block11apartmentbody);

    // Block 12 Rigid Body
    const block12Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(55,1,113)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-420,-3,203)
    });
    physicsWorld.addBody(block12Body);

    // Block 12 Buildings
    const block12apartmentbody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,30,72)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-407.5,28,182)
    });
    physicsWorld.addBody(block12apartmentbody);

    const block12cafebody = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(34,8,16.5)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-410,6,281.5)
    });
    physicsWorld.addBody(block12cafebody);

    // Block 13 Rigid Body
    const block13Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(65.4,1,113)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-586.5,-3,203)
    });
    physicsWorld.addBody(block13Body);

    // Block 13 Buildings
    const block13apartment1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-586,80,152)
    });
    physicsWorld.addBody(block13apartment1Body);

    const block13apartment2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(30,100,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-586,80,250)
    });
    physicsWorld.addBody(block13apartment2Body);



    // Block 14 Rigid Body
    const block14Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(223,1,92)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-430,-3,454)
    });
    physicsWorld.addBody(block14Body);

    // Block 14 Buildings
    const block14skyscraper1BodyPart1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(42,200,80)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-510,120,476)
    });
    physicsWorld.addBody(block14skyscraper1BodyPart1);

    const block14skyscraper1BodyPart2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(84,200,35)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-510,120,460)
    });
    physicsWorld.addBody(block14skyscraper1BodyPart2);

    const block14skyscraper2BodyPart1 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(44,200,35)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-296,120,490)
    });
    physicsWorld.addBody(block14skyscraper2BodyPart1);

    const block14skyscraper2BodyPart2 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(38,200,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-280,120,430)
    });
    block14skyscraper2BodyPart2.quaternion.setFromEuler(0, Math.PI / 2.8, 0);
    physicsWorld.addBody(block14skyscraper2BodyPart2);

    const block14skyscraper2BodyPart3 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(38,200,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-320,120,430)
    });
    block14skyscraper2BodyPart3.quaternion.setFromEuler(0, -Math.PI / 2.8, 0);

    physicsWorld.addBody(block14skyscraper2BodyPart3);

    const block14skyscraper2BodyPart4 = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(62,200,30)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-300,120,410)
    });
    physicsWorld.addBody(block14skyscraper2BodyPart4);


    // World Walls
    const worldWall1Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(600,200,20)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-94,120,560)
    });
    physicsWorld.addBody(worldWall1Body);

    const worldWall2Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(660,200,20)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-94,120,-485)
    });
    physicsWorld.addBody(worldWall2Body);

    const worldWall3Body = new CANNON.Body({
      shape: new CANNON.Box(new CANNON.Vec3(20,200,660)), 
      type: CANNON.Body.STATIC, // mass = 0
      //y'si 3 olcak
      position: new CANNON.Vec3(-716,120,0)
    });
    physicsWorld.addBody(worldWall3Body);
  }

  addStaticRigidBodies();

  // Spawn Points for Evil Cubes
  let parkSpawnPoints = [
     [0.1269643438188356, 4, 10.486915964392667],
    [-25.067641125031578, 4, 10.30787217344448],
    [-40.04041423064585, 4, 11.73009463818737],
    [-53.4089668982696, 4, 13.261531952926733],
    [-76.88506500559178, 4, 7.3210666502998],
    [-78.14552904221458, 4, -14.914193724543479],
    [-87.5036805243764, 4, -14.179027474829079],
    [-95.49724940354331, 4, 22.95561576800954],
    [-85.0558570151007, 4, -64.74053725632733],
    [-50.72331801775887, 4, -65.44292205554478],
    [11.601563962907598, 4, -69.57159791583778],
    [-34.66133720549357, 4, -99.57474495889016],
    [69.33127095805175, 4, -48.64574907083466],
    [50.458160176917715, 4, -41.021405169417605],
    [30.20742784271836, 4, -21.380285308367707],
    [-5.097844440726842, 4, -34.043456567191534],
    [-31.7845739215737, 4, -22.91302482273297],
    [-45.58576426750638, 4, -15.017344133787736],
    [-53.800824706880206, 4, -32.77158174429463],
    [100.11807369542626, 4, -32.07871900304713],
    [102.43451789648, 4, -10.597421716338344],
    [120.86480424204431, 4, -8.497928412721992],
    [124.6245962083521, 4, -22.76674829919112],
    [135.146418954213, 4, -36.65069854491995],
    [148.76694522048567, 4, -52.100005466692096],
    [144.57568216279483, 4, -80.2351530740933],
    [130.57678776560888, 4, -98.69548787004507],
    [119.68996981617822, 4, -107.048616005516],
    [81.96632593806522, 4, -99.5121366692416],
    [105.66858528662114, 4, -115.46052016567705],
    [103.47259594681977, 4, -143.24771905938763],
    [121.18837314633399, 4, -149.55158316712007],
    [145.10929759060545, 4, -55.829134934011265],
    [151.26788879576867, 4, -37.25407399489094],
    [166.1368168264086, 4, -22.079988780011092],
    [191.46909192538953, 4, -29.49290505529469],
    [208.32933226471184, 4, -12.82999381806657],
    [252.6845297364633, 4, -17.158057316974006],
    [275.3945179661125, 4, -19.264183021807558],
    [270.4677304875828, 4, -72.1710796880896],
    [214.25837714511513, 4, -104.64914238726988],
    [222.86942843476456, 4, -122.18065545170741],
    [237.27588438213388, 4, -119.3054809276901],
    [229.30805965247046, 4, -101.32585375662804],
    [138.68198832293888, 4, -98.09249332590637],
    [118.04823838720897, 4, -130.3152596953957],
    [148.9435071657411, 4, -162.544169445849],
   [160.6424423855413, 4, -155.96838562702337],
    [198.422421879065, 4, -159.55325540897613],
    [237.43651487227203, 4, -166.51596131544375],
    [311.3130399084035, 4, -123.15969621424448],
    [315.1672128265839, 4, -80.91659124818231],
    [289.4100589339768, 4, -67.83900091900142],
    [292.440134375075, 4, -63.58834214237022],
    [313.8919029897354, 4, -49.6116962960682],
    [308.21932514402084, 4, -28.80518379961296],
    [319.21661903211935, 4, -4.281885170705415],
    [302.216744768219, 4, 5.086791769914153],
    [284.1123480467021, 4, 26.3572322967173],
    [249.41764060714885, 4, 16.12839800852873],
    [225.6001259559129, 4, 15.925924202405286],
    [171.86534994278173, 4, 16.822332100859832],
    [164.4276655137876, 4, 16.127094829429616],
    [164.3907746195113, 4, 32.874566316600074],
    [133.1368903885837, 4, 18.87164242105937],
    [101.65923497826866, 4, 8.642939849386543],
    [-3.7135266323998506, 4, 28.36008705315583],
    [-83.64113813095312, 4, -56.936902849671284],
    [-90.08759883411265, 4, -127.23965353362497],
    [-80.94111733526834, 4, -165.93981915387945],
    [-54.12045780244937, 4, -149.47600250854592],
    [-7.871079642465046, 4, -149.40233047842386],
    [27.519988513675273, 4, -162.65765814129642],
    [39.62429213956519, 4, -151.16833038881896],
    [83.5878429625269, 4, -151.4733814788455]];

  console.log("PARK SPAWN POINTS UZUNLUK: ");
  console.log(parkSpawnPoints.length);

  let parkExcludedSpawnPoints = [
    [-680,4,-450],
    [-620,4,-450],
    [-620,4,-420],
    [-630,4,-440],
    [-620,4,-370],
    [-630,4,-350],
    [-600,4,-368],
    [-540,4,-370],
    [-440,4,-350],
    [-300,4,-350],
    [-294,4,-360],
    [-325,4,-355],
    [-320,4,-450],
    [-420,4,-450],
    [-530,4,-450],
    [-680,4,-250],
    [-680,4,-200],
    [-680,4,-150],
    [-680,4,-120],
    [-680,4,-100],
    [-680,4,-70],
    [-680,4,-30],
    [-680,4,50],
    [-680,4,120],
    [-680,4,160],
    [-680,4,200],
    [-680,4,250],
    [-680,4,290],
    [-680,4,330],
    [-680,4,400],
    [-680,4,470],
    [-630,4,-90],
    [-580,4,-90],
    [-575.3025447688652, 4, -77.59895145445753],
    [-578.4315839765861, 4, -40.2514641838506],
    [-531.4509274888327, 4, -72.49271782250891],
    [-519.0264193152398, 4, -88.4163028822899],
    [-509.8665816931645, 4, -119.64759800124195],
    [-510.70729775878186, 4, -167.63660679012608],
    [-531.4563634639547, 4, -201.90956536129138],
    [-584.1906934940783, 4, -204.37089476896128],
    [-616.5340931687547, 4, -206.86601923584348],
    [-552.2857046228856, 4, -241.2122017329234],
    [-531.4071580090581, 4, -287.18402342299237],
    [-474.419336690204, 4, -244.51787330221052],
    [-429.0561825254677, 4, -265.0494594842242],
    [-425.0608118104401, 4, -287.0621831258756],
    [-359.8314162110896, 4, -219.13397804307795],
    [-321.2787880528957, 4, -255.38824050895803],
    [-323.13295099468735, 4, -286.5130522310149],
    [-267.2521948432842, 4, -242.29399651215863],
    [-265.0836170060313, 4, -206.30154407829488],
    [-311.2692735227337, 4, -203.82520493828622],
    [-339.5939332451945, 4, -207.67025142173225],
    [-345.29607892647, 4, -146.60721405424076],
    [-345.56377550043646, 4, -83.82675362023097],
    [-412.26359390436147, 4, -54.892797830834716],
    [-449.0202900386653, 4, -62.96957297831018],
    [-463.4691192961305, 4, -100.79231647891697],
    [-467.87896809424944, 4, -20.58434434437093],
    [-545.5660768395283, 4, 28.86086401767884],
    [-596.6039312612937, 4, 61.826076244050434],
    [-617.9812355666314, 4, 68.3024929213745],
    [-631.3980490374909, 4, 124.41227285860963],
    [-636.6373575835833, 4, 179.58803838578606],
    [-599.2858170949813, 4, 203.997007012412],
    [-627.8017296951929, 4, 248.92163356184744],
    [-628.0540463040224, 4, 293.5461155861254],
    [-589.0122475453192, 4, 301.0202246466191],
    [-589.2368042033497, 4, 338.0128368961141],
    [-641.2936260235595, 4, 342.99229880732406],
    [-614.9767446223117, 4, 405.28986471913066],
    [-624.7506829542546, 4, 448.44625540910795],
    [-617.1202003392398, 4, 492.83641747578565],
    [-583.5101385152836, 4, 520.8011094633936],
    [-493.63555177524063, 4, 309.490008158684],
    [-493.4868813324756, 4, 220.52160900941377],
    [-493.6614382762243, 4, 98.42260951247397],
    [-450.0414145014088, 4, 176.19493113234927],
    [-450.7145207666046, 4, 252.33474577578795],
    [-411.7921144320796, 4, 259.56150706775395],
    [-432.0978887819698, 4, 311.43170350111427],
    [-375.4416563158837, 4, 340.92300446887674],
    [-399.7530448977971, 4, 388.46310567765806],
    [-442.7570538355811, 4, 408.4030029632053],
    [-384.15325776436407, 4, 478.00739439655933],
    [-388.3807633871129, 4, 510.0325036433946],
    [-338.77546179764687, 4, 251.62026796289837],
    [-339.0200657837362, 4, 178.09217239127128],
    [-336.90060966510543, 4, 110.29993849578797],
    [-294.5805837971998, 4, 62.736661616931954],
    [-211.5716984439436, 4, 70.56631092419842],
    [-180.5847686485822, 4, 176.51994445519193],
    [-181.47265053896916, 4, 304.20304575653824],
    [-248.61788436887264, 4, 344.15264702854955],
    [-217.85771170190378, 4, 396.4952596429501],
    [-221.42716808057773, 4, 484.08244569532457],
    [-150.49220464417687, 4, 520.7348576111171],
    [-87.59671737830253, 4, 524.1391110648331],
    [-64.31991578650964, 4, 476.9906611416678],
    [-36.87279625364438, 4, 413.7188189667452],
    [-39.689087415766714, 4, 381.43528180463295],
    [-39.90457490977484, 4, 341.5849694472399],
    [25.632977016816884, 4, 378.736740412297],
    [27.97248460048079, 4, 413.8164539396502],
    [27.272160978845903, 4, 343.6759571143144],
    [78.52080334600694, 4, 384.1821799425552],
    [119.26377831221795, 4, 403.6577663601394],
    [98.42383553528641, 4, 76.37161139596928],
    [145.41728858871855, 4, 137.36742218405678],
    [171.44607028248222, 4, 135.95058963612465],
    [203.8860021703703, 4, 163.68232862799243],
    [225.1048784438177, 4, 155.15585459762073],
    [200.7008341170004, 4, 181.1982665254485],
    [187.38173555833103, 4, 214.5757785629945],
    [305.5918619968162, 4, 99.27361669231173],
    [321.50993857349937, 4, 226.2908109749997],
    [236.84126628783946, 4, 277.25195291867533],
    [225.24328556802882, 4, 301.5978815604397],
    [207.71008979959572, 4, 337.20813347719013],
    [183.04507097871127, 4, 375.44535029650126],
    [145.47822565881603, 4, 350.4050258335572],
    [129.9064650747386, 4, 425.4510944953301],
    [129.40338113841233, 4, 451.8245311989776],
    [180.12855182603823, 4, 449.52082262571554],
    [239.88799672665738, 4, 444.9998326058438],
    [265.9556032755729, 4, 441.9578329412109],
    [266.53733223388787, 4, 418.04780396226596],
    [242.94281611790015, 4, 417.78336999316],
    [284.2130512133465, 4, 418.00100074584543],
    [309.77718389858285, 4, 410.68740087356093],
    [319.4301278663911, 4, 465.98270833767145],
    [327.7148140514452, 4, 475.1262887852694],
    [169.35569109484945, 4, 482.64415060611753],
    [354.32173883326703, 4, 450.31325973903625],
    [391.2416042203812, 4, 402.25807511320335],
    [404.7265019575121, 4, 419.00584271363937],
    [444.4058343088604, 4, 418.2217072208066],
    [460.061932333625, 4, 400.3077282318696],
    [476.7365882734614, 4, 227.96188094882203],
    [479.5907072118094, 4, -34.16608522876093],
    [468.23281259081176, 4, -69.01973133649126],
    [437.9400121594788, 4, -233.46159275628023],
    [468.7597962657904, 4, -275.4239663963761],
    [435.1699091084712, 4, -333.80148774684574],
    [450.48309563370265, 4, -410.2960001989744],
    [471.0465768347003, 4, -395.64674606046475],
    [488.6750195299755, 4, -432.733876589418],
    [410.6057832659749, 4, -439.5541530574603],
    [390.033372458042, 4, -438.705621276073],
    [365.43530125657975, 4, -442.53757800686463],
    [351.3168197879331, 4, -439.1645488485374],
    [355.22905054324747, 4, -405.67356652324196],
    [348.32962625930276, 4, -391.12718221523835],
    [327.58248762684156, 4, -412.222949348901],
    [290.66967535803786, 4, -437.3599531667781],
    [289.7865979591637, 4, -412.53764392014716],
    [245.6587250976843, 4, -432.5933856991782],
    [175.8669128338872, 4, -410.6587237915367],
    [144.04968572514278, 4, -396.1399732606308],
    [64.37496429409622, 4, -402.5927474725413],
    [-7.240492269968325, 4, -396.3701560069922],
    [-100.04309504672244, 4, -448.21637299997786],
    [-136.78303668292892, 4, -451.2293005900089],
    [-132.53464200066938, 4, -406.06986029956533],
    [-143.00235858541865, 4, -395.6535735940008],
    [-147.98615821983603, 4, -411.45222991387453],
    [-165.52557170923728, 4, -436.3459292113274],
    [-194.3712824356022, 4, -441.8146378355925],
    [-174.8189470092272, 4, -390.13459259462775],
    [-189.67806460485755, 4, -343.7548107378145],
    [-180.57110976359942, 4, -315.8440259399964],
    [-191.78492122382627, 4, -268.6889854626741],
    [-215.33539806203814, 4, -287.2612561201632],
    [-218.74766076321018, 4, -354.1724113382137],
    [-23.708499861838376, 4, -209.2901830442609],
    [-7.239112408454899, 4, -325.83967562239036],
    [133.40986678461022, 4, -265.6063156587156],
    [175.92600582081798, 4, -305.6079432254746],
    [251.25019825583792, 4, -319.75052917489313],
    [322.5143989349263, 4, -236.08808456883224],
    [325.989383406544, 4, 56.79121889100636],
    [-170.19912274007729, 4, 60.2721534978306],
    [-353.58594937282913, 4, 79.87406746560886],
    [-403.49706647148196, 4, 67.72733837914241],
    [-530.9551044268369, 4, 62.38302484230058],
    [-499.0720632630968, 4, 163.13946660276662],
    [-192.7563626805993, 4, 315.3731131755196],
    [-138.24362601512055, 4, 188.06385738773096],
    [-77.72193539595592, 4, 181.6215882558534],
    [0.669849481901212, 4, 178.89259683242074],
    [9.98731068558557, 4, 156.5717419269336],
    [6.2031720599512425, 4, 137.19522243265854],
    [11.68184874351624, 4, 100.50510148383245],
    [35.160449505180004, 4, 98.47401070817989]
  ];

  console.log("PARK EXCLUDED POINTS UZUNLUK: ");
  console.log(parkExcludedSpawnPoints.length);

  let citySpawnPoints = parkExcludedSpawnPoints.concat(parkSpawnPoints);

  console.log("CITY SPAWN POINTS UZUNLUK: ");
  console.log(citySpawnPoints.length);


  // Lighting
  var dayAmbientLightIntensity = 0.5;
  var nightAmbientLightIntensity = 0.03;
  const ambientLight = new THREE.AmbientLight(0xffffff);
  // scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(30, 300, 2);
  directionalLight.castShadow = true;
  // Optimize ShadowMap Size
  directionalLight.shadow.mapSize.width = 1024; // default is 512, value should be divisible by 2
  directionalLight.shadow.mapSize.height = 1024;

  function adjustLights(){
    if(isNight){
      ambientLight.intensity = nightAmbientLightIntensity;
      scene.remove(ambientLight);
      scene.remove(directionalLight);
    } else {
      ambientLight.intensity = dayAmbientLightIntensity;
      scene.add(ambientLight);
      scene.add(directionalLight);
      if(isFlashlightActive) {
        isFlashlightActive = !isFlashlightActive;
        scene.remove(rubiksCube.flashlight);
      }
    }  
  }

  adjustLights();

  // Spotlights
  let spotlightIntensity = new THREE.Vector3(0.0,0.0,0.0); // Intensity of the spotlight
  let spotlightPosition1;
  let spotlightPosition2;
  let spotlightPosition3;
  let spotlightPosition4;
  let grassMaterial1;
  let grassMaterial2;
  let grassMaterial3;
  let grassMaterial4;
  let grassMesh1;
  let grassMesh2;
  let grassMesh3;
  let grassMesh4;
  let spotlightOscillationAmplitude; // The maximum distance the spotlight will move from its original position
  let spotlightOscillationSpeed; // How fast the spotlight will oscillate
  let originalSpotlightX1;

  let originalSpotlightX2;
  let originalSpotlightX3;
  let originalSpotlightX4;

  let spotlightsOpen = false;

  function createSpotlightsAndMaterials(){
    const spotlightDirection1 = new THREE.Vector3(0.0, -1.0, -3.0); 
    const spotlightCutOff = Math.cos(THREE.MathUtils.degToRad(60)); 

    spotlightPosition1 = new THREE.Vector3(-10.0, 10.0, 5.0); 

    grassMaterial1 = new THREE.ShaderMaterial({
      uniforms: {
        Ka: { value: new THREE.Vector3(0.9, 0.5, 0.3) },
        Kd: { value: new THREE.Vector3(0.9, 0.5, 0.3) },
        Ks: { value: new THREE.Vector3(0.8, 0.8, 0.8) },
        Shininess: { value: 200.0 },
        objectColor: {value: new THREE.Vector3(1.0,0.0,0.0)},
        SpotlightPosition: { value: spotlightPosition1 },
        SpotlightDirection: { value: spotlightDirection1 },
        SpotlightCutOff: { value: spotlightCutOff },
        SpotlightIntensity: { value: spotlightIntensity }
      },
      vertexShader: phongVertexShader,
      fragmentShader: phongFragmentShader,
      side: THREE.DoubleSide
      });


    spotlightPosition2 = new THREE.Vector3(5.0, 10.0, 5.0);
    const spotlightDirection2 = new THREE.Vector3(0.0, -1.0, -4.0); 
  
    grassMaterial2 = new THREE.ShaderMaterial({
        uniforms: {
          Ka: { value: new THREE.Vector3(0.9, 0.5, 0.3) },
          Kd: { value: new THREE.Vector3(0.9, 0.5, 0.3) },
          Ks: { value: new THREE.Vector3(0.8, 0.8, 0.8) },
          Shininess: { value: 200.0 },
          objectColor: {value: new THREE.Vector3(0.0,1.0,0.0)},
          SpotlightPosition: { value: spotlightPosition2 },
          SpotlightDirection: { value: spotlightDirection2 },
          SpotlightCutOff: { value: spotlightCutOff },
          SpotlightIntensity: { value: spotlightIntensity }
        },
        vertexShader: phongVertexShader,
        fragmentShader: phongFragmentShader,
        side: THREE.DoubleSide
        });

    spotlightPosition3 = new THREE.Vector3(10.0, 10.0, 5.0); 
    const spotlightDirection3 = new THREE.Vector3(0.0, -1.0, -4.0);
  
    grassMaterial3 = new THREE.ShaderMaterial({
        uniforms: {
          Ka: { value: new THREE.Vector3(0.9, 0.5, 0.3) },
          Kd: { value: new THREE.Vector3(0.9, 0.5, 0.3) },
          Ks: { value: new THREE.Vector3(0.8, 0.8, 0.8) },
          Shininess: { value: 200.0 },
          objectColor: {value: new THREE.Vector3(0.0,0.0,1.0)},
          SpotlightPosition: { value: spotlightPosition3 },
          SpotlightDirection: { value: spotlightDirection3 },
          SpotlightCutOff: { value: spotlightCutOff },
          SpotlightIntensity: { value: spotlightIntensity }
        },
        vertexShader: phongVertexShader,
        fragmentShader: phongFragmentShader,
        side: THREE.DoubleSide
        });

    spotlightPosition4 = new THREE.Vector3(10.0, 10.0, 5.0); 
    const spotlightDirection4 = new THREE.Vector3(0.0, -1.0, -3.0); 
    grassMaterial4 = new THREE.ShaderMaterial({
      uniforms: {
        Ka: { value: new THREE.Vector3(0.9, 0.5, 0.3) },
        Kd: { value: new THREE.Vector3(0.9, 0.5, 0.3) },
        Ks: { value: new THREE.Vector3(0.8, 0.8, 0.8) },
        Shininess: { value: 200.0 },
        objectColor: {value: new THREE.Vector3(1.0,1.0,0.0)},
        SpotlightPosition: { value: spotlightPosition4 },
        SpotlightDirection: { value: spotlightDirection4 },
        SpotlightCutOff: { value: spotlightCutOff },
        SpotlightIntensity: { value: spotlightIntensity }
        },
        vertexShader: phongVertexShader,
        fragmentShader: phongFragmentShader,
        side: THREE.DoubleSide
      });

      spotlightOscillationAmplitude = 50; // The maximum distance the spotlight will move from its original position
    spotlightOscillationSpeed = 2; // How fast the spotlight will oscillate
    

    originalSpotlightX1 = spotlightPosition1.x;
    
    originalSpotlightX2 = spotlightPosition2.x;
    originalSpotlightX3 = spotlightPosition3.x;
    originalSpotlightX4 = spotlightPosition4.x;
    
  }

  function createIlluminatedMeshes(){
    // Grass Meshes
  const grassGeo = new THREE.PlaneGeometry(150,52);
  // GrassMesh1
  grassMesh1 = new THREE.Mesh(grassGeo,grassMaterial1);
  grassMesh1.rotation.x = 1.57079633;
  grassMesh1.position.x = 15;
  grassMesh1.position.z = -30;
  grassMesh1.position.y = -1.5;

  // GrassMesh2
  grassMesh2 = new THREE.Mesh(grassGeo,grassMaterial2);
  grassMesh2.rotation.x = 1.57079633;
  grassMesh2.position.x = 15;
  grassMesh2.position.z = -107.5;
  grassMesh2.position.y = -1.5;

  // GrassMesh3
  grassMesh3 = new THREE.Mesh(grassGeo,grassMaterial3);
  grassMesh3.rotation.x = 1.57079633;
  grassMesh3.position.x = 212;
  grassMesh3.position.z = -30;
  grassMesh3.position.y = -1.5;



  // GrassMesh4
  grassMesh4 = new THREE.Mesh(grassGeo,grassMaterial4);
  grassMesh4.rotation.x = 1.57079633;
  grassMesh4.position.x = 212;
  grassMesh4.position.z = -107.5;
  grassMesh4.position.y = -1.5;
  }

  function toggleIlluminatedMeshes(){
    if(isNight){
      scene.add(grassMesh1);
      scene.add(grassMesh2);
      scene.add(grassMesh3);
      scene.add(grassMesh4);
    }
    else {
      scene.remove(grassMesh1);
      scene.remove(grassMesh2);
      scene.remove(grassMesh3);
      scene.remove(grassMesh4);
    }
  }

  function toggleFlashlight(){
  if(isNight){
    isFlashlightActive = !isFlashlightActive;
    if(isFlashlightActive){
      scene.add(rubiksCube.flashlight);
    }
    else{
      scene.remove(rubiksCube.flashlight);
    }
  }
  }

  function toggleParkSpotlights(){
  if(isNight){
    spotlightsOpen = !spotlightsOpen;

    if (spotlightsOpen){
      spotlightIntensity = new THREE.Vector3(1.0, 1.0, 1.0); // Intensity of the spotlight
    }
    else {
      spotlightIntensity = new THREE.Vector3(0.0, 0.0, 0.0); 
    }
  }
  }



  createSpotlightsAndMaterials();
  createIlluminatedMeshes();
  toggleIlluminatedMeshes();




  function updateSpotLightsAndMaterials(elapsedTime){
    grassMaterial1.uniforms.SpotlightIntensity.value.copy(spotlightIntensity);
    grassMaterial2.uniforms.SpotlightIntensity.value.copy(spotlightIntensity);
    grassMaterial3.uniforms.SpotlightIntensity.value.copy(spotlightIntensity);
    grassMaterial4.uniforms.SpotlightIntensity.value.copy(spotlightIntensity);


    spotlightPosition1.x = originalSpotlightX1 + Math.sin(elapsedTime * spotlightOscillationSpeed * 1.5 + 3.0) * spotlightOscillationAmplitude;
    spotlightPosition2.x = originalSpotlightX2 + Math.cos(elapsedTime * spotlightOscillationSpeed) * spotlightOscillationAmplitude;
    spotlightPosition3.x = originalSpotlightX3 + Math.cos(elapsedTime * spotlightOscillationSpeed + 2.0) * spotlightOscillationAmplitude;
    spotlightPosition4.x = originalSpotlightX4 + Math.sin(elapsedTime * spotlightOscillationSpeed * 1.5 + 3.0) * spotlightOscillationAmplitude;

    // Update the shader uniform for spotlight position
    grassMaterial1.uniforms.SpotlightPosition.value.copy(spotlightPosition1);
    grassMaterial2.uniforms.SpotlightPosition.value.copy(spotlightPosition2);
    grassMaterial3.uniforms.SpotlightPosition.value.copy(spotlightPosition3);
    grassMaterial4.uniforms.SpotlightPosition.value.copy(spotlightPosition4);


  }

  document.addEventListener('keydown',(e)=>{
    
    if(gameMode == 'free_roam'){
      if(e.key == 'e'){
        rubiksCube.spawnRandomObject();
      }
    }
   

 
    if(e.key == 'p'){

      if(isNight){
        if(rubiksCube.checkIfInProximityOfLever(lever)) {
          
          if(leverState == 'Deactivated Idle'){
            const toPlay = leverAnimationsMap.get('Activated Idle');
            const current = leverAnimationsMap.get(leverState);
            current.fadeOut(0.4);
            toPlay.reset().fadeIn(0.4).play();
            leverState = 'Activated Idle';
          } else if(leverState == 'Activated Idle'){
            const toPlay = leverAnimationsMap.get('Deactivated Idle');
            const current = leverAnimationsMap.get(leverState);
            current.fadeOut(0.4);
            toPlay.reset().fadeIn(0.4).play();
            leverState = 'Deactivated Idle';
          }
          toggleParkSpotlights();
        }
        
      }
      
      
    }
    // Activate/deactivate flashlight
    if(e.key == 'f'){
      toggleFlashlight();

    }
    // Toggle between day and night
    if(e.key == 'n'){
      if(gameMode === 'free_roam'){
        isNight = !isNight;
        adjustLights();
        toggleIlluminatedMeshes();
      
      if(!isNight){
        batteryBarContainer.style.display = "none";
        city_envTexture = textureLoader.load("/assets/skybox/spherical_skybox_day.jpg");
        mesh.material.map = city_envTexture;
        spotlightsOpen = false;
        spotlightIntensity = new THREE.Vector3(0.0, 0.0, 0.0); 
        evilCubesSpecific.forEach((evilCube,evilCubeId) => {
          if(evilCube){
            if(!evilCube.isDead){
              evilCube.changeToOriginalMaterial();
            }
          }
        });
      }
      else {
        batteryBarContainer.style.display = "block";
        city_envTexture = textureLoader.load("/assets/skybox/spherical_skybox_night.png");
        mesh.material.map = city_envTexture;
      }
         
     }
  }
  });





  //Camera
  const aspect = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const camera = new THREE.PerspectiveCamera(
    75,
    aspect.width / aspect.height,
  );
  camera.position.y = 5;
  if(gameMode == 'race_against_time' || gameMode == 'free_roam'){
    camera.position.x = 0;
    camera.position.z = 10;
  } else if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
    camera.position.x = 480;
    camera.position.z = 540;
  }
  
  scene.add(camera);

  //OrbitControl
  const orbitControls = new OrbitControls(camera, canvas);
  orbitControls.enableDamping = true;


  //Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(aspect.width, aspect.height);
  // tell the renderer to render shadow map

  // RAYCASTER
  let rayCaster;
  let pointer;
  let intersects;
  let oneIntersectMesh = [];

  if(gameMode == 'free_roam'){
    rayCaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
  }
  window.addEventListener('mousemove',(e)=>{
    pointer.x = (e.clientX / window.innerWidth) * 2 -1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    // Casting Ray
    if(rayCaster && pointer){
      rayCaster.setFromCamera(pointer, camera)
      intersects = rayCaster.intersectObjects(randomObjects);
      if(intersects.length >0){
        if(oneIntersectMesh.length < 1){
          oneIntersectMesh.push(intersects[0]);
        }
   
      } else if(oneIntersectMesh[0]!==undefined){

        oneIntersectMesh.shift();
      }

    }
  });



  var selectedRandomObject;
  var selectedRandomObjectName = "";
  var selectedRandomObjectIndex;
  
  var transformString = "...";
  var whichAxisString = "..."
  var translationMode = false;
  var rotationMode = false;
  var scaleMode = false;
  var whichAxis;  

  // Update selected object's div function
  const infoDiv = document.getElementById('infoDiv');
  
  function updateInfoDiv() {
    document.getElementById('objectName').textContent = selectedRandomObjectName;
    document.getElementById('positionX').textContent = selectedRandomObject.position.x.toFixed(2);
    document.getElementById('positionY').textContent = selectedRandomObject.position.y.toFixed(2);
    document.getElementById('positionZ').textContent = selectedRandomObject.position.z.toFixed(2);
    document.getElementById('orientationX').textContent = selectedRandomObject.rotation.x.toFixed(2);
    document.getElementById('orientationY').textContent = selectedRandomObject.rotation.y.toFixed(2);
    document.getElementById('orientationZ').textContent = selectedRandomObject.rotation.z.toFixed(2);
    document.getElementById('scaleX').textContent = selectedRandomObject.scale.x.toFixed(2);
    document.getElementById('scaleY').textContent = selectedRandomObject.scale.y.toFixed(2);
    document.getElementById('scaleZ').textContent = selectedRandomObject.scale.z.toFixed(2);
    document.getElementById('transformationMode').textContent = transformString;
    document.getElementById('axis').textContent = whichAxisString;
  }

  
  // Sidebar for Transforms
  const sidebar = document.getElementById('sidebar');
  document.querySelectorAll('.transform-button').forEach(button => {
    button.addEventListener('click', function() {

        document.querySelectorAll('.transform-button').forEach(btn => btn.classList.remove('clicked'));

        this.classList.add('clicked');

        switch(this.id) {
            case 'translateButton':
                translationMode = true;
                scaleMode = false;
                rotationMode = false;
                transformString = "Translation";
                break;
            case 'rotateButton':
                rotationMode = true;
                translationMode = false;
                scaleMode = false;
                transformString = "Rotation";
                break;
            case 'scaleButton':
                scaleMode = true;
                translationMode = false;
                rotationMode = false;
                transformString = "Scale";
                break;
            default:
                console.log("Unknown transform mode");
        }
    });
  });

  function calculateDistance(vec_1,vec_2){
    return Math.sqrt((vec_1.x - vec_2.x) ** 2 + (vec_1.y - vec_2.y) ** 2 + (vec_1.z - vec_2.z) ** 2);
  }


  window.addEventListener('click',(e)=>{
 
    if(oneIntersectMesh.length > 0){
      let candidates = [];
      console.log("Intersect element: ");
      console.log(oneIntersectMesh[0]);
      console.log("random objects: ");
      console.log(randomObjects)

      for(let i = 0; i < randomObjects.length; i++){
        if(randomObjects[i].getObjectByName(oneIntersectMesh[0].object.name)){
          candidates.push(i);
 
        }
      }
      if(candidates.length > 1){
        let distances = [];
        for(let j = 0; j < candidates.length; j++){
          const dist = calculateDistance(randomObjects[candidates[j]].position, oneIntersectMesh[0].point);
          distances.push(dist);
        }
        
        const minVal = Math.min(...distances);
        const minValIndex = distances.indexOf(minVal);
        const trueIndex = candidates[minValIndex];
        selectedRandomObject = randomObjects[trueIndex];
        selectedRandomObjectName = randomObjectNames[trueIndex];
        selectedRandomObjectIndex = trueIndex;
        console.log("Selected Object name: ")
        console.log(randomObjectNames[trueIndex]);
        sidebar.style.display = "block";
        infoDiv.style.display = "block";
        
      } else if(candidates.length == 1){
        const trueIndex = candidates[0];
        selectedRandomObject = randomObjects[trueIndex];
        selectedRandomObjectName = randomObjectNames[trueIndex];
        selectedRandomObjectIndex = trueIndex;
        console.log("Selected Object name: ")
        console.log(randomObjectNames[trueIndex]);
        sidebar.style.display = "block";
        infoDiv.style.display = "block";
      }
 
      console.log("Selected Object: ");
      console.log(selectedRandomObject);         

    } 
  });

    window.addEventListener('keydown',(e)=>{
      if(selectedRandomObject){
        if(e.key == 'Backspace'){
          selectedRandomObject = null;
          selectedRandomObjectName = "";
          sidebar.style.display = "none";
          infoDiv.style.display = "none";
        }
        if(e.key == 'x'){
          whichAxis = 'x';
          whichAxisString = "X";
        } else if(e.key == 'y'){
          whichAxis = 'y';
          whichAxisString = "Y";
        } else if (e.key == 'z'){
          whichAxis = 'z';
          whichAxisString = "Z";
        } else if(e.key == 'Delete'){
          console.log("DELETE");
          scene.remove(selectedRandomObject);
          randomObjects.splice(selectedRandomObjectIndex,1);
          randomObjectNames.splice(selectedRandomObjectIndex,1);
          selectedRandomObject = null;
          selectedRandomObjectName = "";
          // translationMode = false;
          // rotationMode = false;
          // scaleMode = false;
          // whichAxis = false;
          sidebar.style.display = "none";
          infoDiv.style.display = "none";
        } else if(e.key == '+'){
            console.log("salamun aleyk")
            if(translationMode){
              if(whichAxis == 'x'){
                selectedRandomObject.position.x += 0.1;
              }
              else if(whichAxis == 'y'){
                selectedRandomObject.position.y += 0.1;
              } 
              else if(whichAxis == 'z'){
                selectedRandomObject.position.z += 0.1;
              }
              
            }
            else if(rotationMode){
              if(whichAxis == 'x'){
                selectedRandomObject.rotation.x += 0.1;
              }
              else if(whichAxis == 'y'){
                selectedRandomObject.rotation.y += 0.1;
              } 
              else if(whichAxis == 'z'){
                selectedRandomObject.rotation.z += 0.1;
              }
            }
            else if(scaleMode){
              if(whichAxis == 'x'){
                selectedRandomObject.scale.x += 0.1;
              }
              else if(whichAxis == 'y'){
                selectedRandomObject.scale.y += 0.1;
              } 
              else if(whichAxis == 'z'){
                selectedRandomObject.scale.z += 0.1;
              }
            }
          } else if(e.key == '-'){
            console.log("salamun aleyk")
            if(translationMode){
              if(whichAxis == 'x'){
                selectedRandomObject.position.x -= 0.1;
              }
              else if(whichAxis == 'y'){
                selectedRandomObject.position.y -= 0.1;
              } 
              else if(whichAxis == 'z'){
                selectedRandomObject.position.z -= 0.1;
              }
              
            }
            else if(rotationMode){
              if(whichAxis == 'x'){
                selectedRandomObject.rotation.x -= 0.1;
              }
              else if(whichAxis == 'y'){
                selectedRandomObject.rotation.y -= 0.1;
              } 
              else if(whichAxis == 'z'){
                selectedRandomObject.rotation.z -= 0.1;
              }
            }
            else if(scaleMode){
              if(whichAxis == 'x'){
                selectedRandomObject.scale.x -= 0.1;
              }
              else if(whichAxis == 'y'){
                selectedRandomObject.scale.y -= 0.1;
              } 
              else if(whichAxis == 'z'){
                selectedRandomObject.scale.z -= 0.1;
              }
            }
          }  
          
        } 


    else {
       
    }
  });
  

  //Resizing
  window.addEventListener("resize", () => {
    //Update Size
    aspect.width = window.innerWidth;
    aspect.height = window.innerHeight;

    //New Aspect Ratio
    camera.aspect = aspect.width / aspect.height;
    camera.updateProjectionMatrix();

    //New RendererSize
    renderer.setSize(aspect.width, aspect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    smokeRenderer.setSize(window.innerWidth, window.innerHeight);
    smokeRenderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  });


  //Loading Models
  //1) Rubiks Cube
  let animationMixer;
  var rubiksCube = null;

  let cubeGraph;
  gltfLoader.load("/assets/original_rubik's_cube_animated_fixed.glb", (gltf) => {

    const rubiksCubeModel = gltf.scene;
    rubiksCubeModel.traverse(function (object){
      if (object.isMesh){ 
        object.castShadow = true;
      }
    });
    console.log("Rubik's cube: ");
    console.log(rubiksCubeModel);
    scene.add(rubiksCubeModel);
    animationMixer = new THREE.AnimationMixer(rubiksCubeModel);
    const clips = gltf.animations;
    const animationsMap = new Map();
    clips.forEach((clip)=>{
      animationsMap.set(clip.name, animationMixer.clipAction(clip))
    });

    rubiksCube = RubiksCube.initializeRubiksCube(gltf.scene,animationMixer,animationsMap,orbitControls,camera);

  },(xhr)=> { 
    // console.log( (xhr.loaded / xhr.total * 100) + '%loaded');
  },
  // called when loading has errors
  (error)=>{
    // TO LOAD A COMPRESSED MODEL, YOU NEED TO USE THE DRACOLOADER
    console.log("An error happened while loading the Rubik's Cube Model: " + error);
  });


  // City 
  var city = null;
  gltfLoader.load("/assets/city.glb", (gltf) => {
    city = gltf.scene;
    city.traverse(function (object){
      if (object.isMesh){ 
        object.castShadow = true;
      }
    });
    city.position.set(0,-12,0);

    scene.add(city);

    
    
  },(xhr)=> {
    // console.log( (xhr.loaded / xhr.total * 100) + '%loaded');
  },
  // called when loading has errors
  (error)=>{
    console.log("An error happened while loading City Model: " + error);
  });

  var evilCubeCount = 0;
  // Evil Cube
  gltfLoader.load("/assets/evilcube_modified.glb", (gltf) => {
    const evilCubeModel = gltf.scene;
    // console.log("evil cube model: ");
    // console.log(evilCubeModel);
    evilCubeModel.traverse(function (object){
      if (object.isMesh){ 
        object.castShadow = true;
      }
    });

   
    
    if(gameMode == 'race_against_time'){
      evilCubeCount = 20;
    } else if(gameMode == 'find_and_destroy'){
      evilCubeCount = 15;
    }

    if(gameMode == 'night_falls'){
      evilCubeCount = 10;
      for(let i = 0; i < 6; i++){
        const evilCubeClone = SkeletonUtils.clone(evilCubeModel);
        scene.add(evilCubeClone);
        EvilCube.initializeEvilCube(evilCubeClone,true);
      }
      for(let i = 0; i < 4; i++){
        const evilCubeClone = SkeletonUtils.clone(evilCubeModel);
        scene.add(evilCubeClone);
        EvilCube.initializeEvilCube(evilCubeClone,false);
      }
    }
    else {
      for(let i = 0; i < evilCubeCount; i++){
        const evilCubeClone = SkeletonUtils.clone(evilCubeModel);
        // evilCubeClone.matrixAutoUpdate = false;
        scene.add(evilCubeClone);
        EvilCube.initializeEvilCube(evilCubeClone, false);
  
      }
    }
    
    
    

    
  },(xhr)=> {
    // console.log( (xhr.loaded / xhr.total * 100) + '%loaded');
  },
  // called when loading has errors
  (error)=>{
    // TO LOAD A COMPRESSED MODEL, YOU NEED TO USE THE DRACOLOADER
    console.log("An error happened while loading Evil Cube Model: " + error);
  });
  
  var randomObjects = [];
  var randomObjectNames = [];
  var randomModels = [];
  var randomModelNames = [];
  if(gameMode == 'free_roam'){
    gltfLoader.load("/assets/trash_can.glb", (gltf) => {
      const trashCan = gltf.scene;
      // console.log("evil cube model: ");
      // console.log(evilCubeModel);
      trashCan.traverse(function (object){
        if (object.isMesh){ 
          object.castShadow = true;
        }
      });
  
      randomModels.push(trashCan);
      randomModelNames.push("Trash Can");
      
    },(xhr)=> {
      // console.log( (xhr.loaded / xhr.total * 100) + '%loaded');
    },
    // called when loading has errors
    (error)=>{
      // TO LOAD A COMPRESSED MODEL, YOU NEED TO USE THE DRACOLOADER
      console.log("An error happened while loading Trash Can Model: " + error);
    });
  
    gltfLoader.load("/assets/fire_hydrant.glb", (gltf) => {
      const fireHydrant = gltf.scene;

      fireHydrant.traverse(function (object){
        if (object.isMesh){ 
          object.castShadow = true;
        }
      });
  
      randomModels.push(fireHydrant);
      randomModelNames.push("Fire Hydrant");
      
    },(xhr)=> {
      // console.log( (xhr.loaded / xhr.total * 100) + '%loaded');
    },
    // called when loading has errors
    (error)=>{
      // TO LOAD A COMPRESSED MODEL, YOU NEED TO USE THE DRACOLOADER
      console.log("An error happened while loading Fire Hydrant Model: " + error);
    });

    gltfLoader.load("/assets/evilcube_modified.glb", (gltf) => {
      const evilCube = gltf.scene;

      evilCube.traverse(function (object){
        if (object.isMesh){ 
          object.castShadow = true;
        }
      });
  
      randomModels.push(evilCube);
      randomModelNames.push("Evil Cube");
      
    },(xhr)=> {
      
    },
    // called when loading has errors
    (error)=>{
      console.log("An error happened while loading Evil Cube Model: " + error);
    });

    gltfLoader.load("/assets/traffic_lamp.glb", (gltf) => {
      const trafficLight = gltf.scene;

      trafficLight.traverse(function (object){
        if (object.isMesh){ 
          object.castShadow = true;
        }
      });
  
      randomModels.push(trafficLight);
      randomModelNames.push("Traffic Light");
      
    },(xhr)=> {
      
    },
    // called when loading has errors
    (error)=>{
      console.log("An error happened while loading Traffic Light Model: " + error);
    });

    gltfLoader.load("/assets/chair.glb", (gltf) => {
      const chair = gltf.scene;

      chair.traverse(function (object){
        if (object.isMesh){ 
          object.castShadow = true;
        }
      });
  
      randomModels.push(chair);
      randomModelNames.push("Seat");
      
    },(xhr)=> {
      
    },
    // called when loading has errors
    (error)=>{
      console.log("An error happened while loading Chair Model: " + error);
    });

    gltfLoader.load("/assets/tree.glb", (gltf) => {
      const tree = gltf.scene;

      tree.traverse(function (object){
        if (object.isMesh){ 
          object.castShadow = true;
        }
      });
  
      randomModels.push(tree);
      randomModelNames.push("Tree");
      
    },(xhr)=> {
      
    },
    // called when loading has errors
    (error)=>{
      console.log("An error happened while loading Tree Model: " + error);
    });

    

  } 
  


  
  var lever;
  var leverState;
  var leverAnimationMixer;
  var leverAnimationsMap;
  gltfLoader.load("/assets/lever.glb", (gltf) => {
    lever = gltf.scene;

    lever.traverse(function (object){
      if (object.isMesh){ 
        object.castShadow = true;
      }
    });
    scene.add(lever);
    lever.position.x = 90;
    lever.position.z = -18.6;
    lever.position.y = 3;
    lever.scale.x = 2;
    lever.scale.y = 2;
    lever.scale.z = 2;
    leverState = "Deactivated Idle";

    leverAnimationMixer = new THREE.AnimationMixer(lever);
    const clips = gltf.animations;
    leverAnimationsMap = new Map();
    clips.forEach((clip)=>{
      leverAnimationsMap.set(clip.name, leverAnimationMixer.clipAction(clip))
    });

    console.log("LEVER ANİMATİONS MAP: ");
    console.log(leverAnimationsMap);
    
  },(xhr)=> {
    // console.log( (xhr.loaded / xhr.total * 100) + '%loaded');
  },
  // called when loading has errors
  (error)=>{
    console.log("An error happened while loading Lever Model: " + error);
  });

  


  // SMOKE SCENE
  let smokeExists = false;
  var smokeScene;
  var smokeRenderer;
  var smokeCanvas;
  var smokeCamera;

  
  if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
    console.log("EVET SMOKE EXISTS");
    smokeExists = true;
  }
  
  

  function smoke_scene_setup(){
    smokeScene = new THREE.Scene();
    smokeScene.background = null;
    var width = window.innerWidth;
    var height = window.innerHeight;

    smokeCamera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );
    smokeCamera.position.z = 2;


    smokeCanvas = document.getElementById("smoke-surface");
    smokeRenderer = new THREE.WebGLRenderer( { canvas: smokeCanvas} );

    smokeRenderer.setSize( window.innerWidth, window.innerHeight );

  }


  //Initialize the Threejs smoke scene
  if(smokeExists){
    smoke_scene_setup();
  }



  var bufferScene;
  var textureA;
  var textureB;
  var bufferMaterial;
  var plane;
  var bufferObject;
  var finalMaterial;
  var quad;

  function buffer_texture_setup(){
    //Create buffer scene
    bufferScene = new THREE.Scene();
    //Create 2 buffer textures
    textureA = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
    textureB = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter} );
    //Pass textureA to shader
    bufferMaterial = new THREE.ShaderMaterial( {
      uniforms: {
        bufferTexture: { type: "t", value: textureA },
        res : {type: 'v2',value:new THREE.Vector2(window.innerWidth,window.innerHeight)},//Keeps the resolution
        smokeSource: {type:"v3",value:new THREE.Vector3(0,0,0)},
        time: {type:"f",value:Math.random()*Math.PI*2+Math.PI},
        smokePointCoefficient: {type:"f", value: pollutionLevel} 
      },
      fragmentShader: smokeFragmentShader
    } );
    plane = new THREE.PlaneGeometry( window.innerWidth, window.innerHeight );
    bufferMaterial.transparent = true;
    bufferMaterial.opacity = 0.2;
    bufferObject = new THREE.Mesh( plane, bufferMaterial );
    bufferScene.add(bufferObject);

    //Draw textureB to screen 
    finalMaterial =  new THREE.MeshBasicMaterial({map: textureB});
    finalMaterial.transparent = true;
    finalMaterial.opacity = 0.2;

    quad = new THREE.Mesh( plane, finalMaterial );
    smokeScene.add(quad);
  }

  if(smokeExists){
    buffer_texture_setup();
  }
 



  //Clock Class
  const clock = new THREE.Clock();
  let previousTime = 0;


  const animate = () => {
  
    //getElapsedTime
    const elapsedTime = clock.getElapsedTime();
    let mixerUpdateDelta = clock.getDelta();
    const popUpMenuTime = Date.now();
    const popUpMenuTimePassed = (popUpMenuTime - startTime) / 1000;
    // time moving from the previous frame to the current frame
    const frameTime = elapsedTime - previousTime; // 0.004 - 0.002 = 0.002
    previousTime = elapsedTime; // previousTime = 0.004

    if(popUpMenuTimePassed >= 1.5 && popUpMenuTimePassed < 2){
      pauseGame();
      document.getElementById('howToPlayPopup').style.display = 'block';
      document.getElementById('infoTab').click(); 

      var infoText;
      var controlsText;
      if(gameMode == 'race_against_time'){
        infoText = infoRaceAgainstTime;
        controlsText = controlsRaceAgainstTimeAndFindAndDestroy;
      } else if(gameMode == 'find_and_destroy'){
        infoText = infoFindAndDestroy;
        controlsText = controlsRaceAgainstTimeAndFindAndDestroy;
      } else if(gameMode == 'night_falls'){
        infoText = infoNightFalls;
        controlsText = controlsNightFalls;
      } else if(gameMode == 'free_roam'){
        infoText = infoFreeRoam;
        controlsText = controlsFreeRoam;
      }

      document.getElementById('infoContent').innerHTML = infoText;
      document.getElementById('controlsContent').innerHTML = controlsText;
      document.getElementById('closePopup').innerHTML = 'Start!';
      
    }

    if(selectedRandomObject){
      updateInfoDiv(selectedRandomObject);
    }




    updateSpotLightsAndMaterials(elapsedTime);

    // cannon debugger
    if(cannonDebugger){
      cannonDebugger.update();
    }
    
    
    
    evilCubes.forEach((evilCube,evilCubeId) => {
      if(evilCube){
        if(!evilCube.isDead){
          evilCube.update(frameTime);
        }
        else {
          evilCube.updateExplosionMesh();
        }
      }
    });


    if(rubiksCube){
      rubiksCube.update(frameTime,keysPressed,mixerUpdateDelta);
      rubiksCube.updateModelPosition(frameTime);
    }

    

    // Update Lever Animation Mixer
    if(leverAnimationMixer && lever){
      leverAnimationMixer.update(frameTime);
    }
 



    //Update Controls
    orbitControls.update();

    // Physics World
    physicsWorld.step(timeStep);

    if (cubeGraph && !isGamePaused) {

      cubeGraph.update();

    }
    // Renderer
    if(isGamePaused!==true){
      renderer.render(scene, camera);
      // console.log("POLLUTION LEVEL: ");
      // console.log(pollutionLevel);

      if(smokeExists){
        smokeRenderer.setRenderTarget(textureB);
        smokeRenderer.render(bufferScene,smokeCamera);
    
        // Swap textureA and B
        var t = textureA;
        textureA = textureB;
        textureB = t;
        quad.material.map = textureB.texture;
        bufferMaterial.uniforms.bufferTexture.value = textureA.texture;
    
        //Update time
        bufferMaterial.uniforms.time.value += 0.01;
        bufferMaterial.uniforms.smokePointCoefficient.value = pollutionLevel;
    
        // Render to the screen without clearing
        smokeRenderer.setRenderTarget(null);
        smokeRenderer.clear(false); // Disable clearing
        smokeRenderer.autoClear = false; // Do not clear automatically
        smokeRenderer.clearDepth(); // Clear only the depth buffer
        smokeRenderer.render(smokeScene, smokeCamera);
      }
    
    }

   
    if(isLoaded){
      if(gameMode == 'find_and_destroy' || gameMode == 'night_falls'){
        if(pollutionLevel >= 2.0){
          endTime = Date.now();
          const timeTaken = (endTime - startTime) / 1000;
  
          showGameOver(false,pollutionLevel,timeTaken);
          return;
        } 
        if(evilCubesSpecific.size <= 0){
          endTime = Date.now();
          const timeTaken = (endTime - startTime) / 1000;
          showGameOver(true,pollutionLevel,timeTaken);
          return;
        }
      }
    }
    
      

    //RequestAnimationFrame
    window.requestAnimationFrame(animate);
  };
  animate();



}

import * as THREE from 'three';
import Stats from 'https://unpkg.com/three@0.163.0/examples/jsm/libs/stats.module.js';
import { GUI } from 'https://unpkg.com/three@0.163.0/examples/jsm/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import { Capsule } from 'three/addons/math/Capsule.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

const clock = new THREE.Clock();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccee);
scene.fog = new THREE.Fog(0x88ccee, 0, 50);

document.getElementById('restartBtn').addEventListener('click', () => {
  // Ocultar los elementos de muerte
  document.getElementById('deathMessage').style.display = 'none';
  document.getElementById('restartBtn').style.display = 'none';

  // Reiniciar variables del jugador
  playerHealth = 5;
  isPlayerDead = false;
  updateHealthBar();

  // Resetear posición del jugador correctamente
  playerCollider.start.set(0, 5.35, 0);  // posición inicial start
  playerCollider.end.set(0, 6, 0);       // posición inicial end
  camera.position.copy(playerCollider.end);
  camera.rotation.set(0, 0, 0);
  
  // Resetear velocidad
  playerVelocity.set(0, 0, 0);
  
  // Resetear zombies (opcional)
  zombies.forEach(zombie => {
    if (zombie.health <= 0) {
      zombie.health = 3;
      zombie.model.position.set(
        (Math.random() - 0.5) * 40,
        0,
        (Math.random() - 0.5) * 40
      );
      zombie.model.visible = true;
      switchZombieAction(zombie, 'idle');
    }
  });

  console.log("Juego reiniciado correctamente.");
});

const cameraGroup = new THREE.Group();
scene.add(cameraGroup);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';


let worldReady = false;
const fillLight1 = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
fillLight1.position.set(2, 1, 1);
scene.add(fillLight1);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(- 5, 25, - 1);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = - 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = - 30;
directionalLight.shadow.mapSize.width = 512;
directionalLight.shadow.mapSize.height = 512;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = - 0.00006;
scene.add(directionalLight);

const container = document.getElementById('container');
// Crear HUD de Vida
const healthBarContainer = document.createElement('div');
healthBarContainer.style.position = 'absolute';
healthBarContainer.style.top = '20px';
healthBarContainer.style.left = '20px';
healthBarContainer.style.width = '200px';
healthBarContainer.style.height = '25px';
healthBarContainer.style.backgroundColor = '#555';
healthBarContainer.style.border = '2px solid white';
healthBarContainer.style.zIndex = '100';

const healthBar = document.createElement('div');
healthBar.style.width = '100%';
healthBar.style.height = '100%';
healthBar.style.backgroundColor = '#0f0'; // verde

healthBarContainer.appendChild(healthBar);
container.appendChild(healthBarContainer);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

renderer.xr.addEventListener('sessionstart', () => {
  // Resetear posición cuando comienza la sesión VR
  cameraGroup.position.set(0, 0, 0);
  cameraGroup.rotation.set(0, 0, 0);
});

document.body.appendChild(VRButton.createButton(renderer));
renderer.setAnimationLoop(function() {
  if (renderer.xr.isPresenting) {
    animate();
  } else {
    // Render normal cuando no está en VR
    renderer.render(scene, camera);
  }
});

// Crear un listener de audio (debe estar conectado a la cámara)
const listener = new THREE.AudioListener();
camera.add(listener);

// Cargar el sonido de fondo
const backgroundSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('../sonidos/ambiente.mp3', function (buffer) {
  backgroundSound.setBuffer(buffer);
  backgroundSound.setLoop(true);
  backgroundSound.setVolume(0.5); // Puedes ajustar volumen
  backgroundSound.play();
});

const stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
container.appendChild(stats.domElement);


const GRAVITY = 30;
const fbxLoader = new FBXLoader();
const NUM_SPHERES = 100;
const SPHERE_RADIUS = 0.1;

const STEPS_PER_FRAME = 3;
const zombies = [];


const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xdede8d });

const spheres = [];
let sphereIdx = 0;

for (let i = 0; i < NUM_SPHERES; i++) {

  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.active = false;
  sphere.castShadow = true;
  sphere.receiveShadow = true;

  scene.add(sphere);

  spheres.push({
    mesh: sphere,
    collider: new THREE.Sphere(new THREE.Vector3(0, - 100, 0), SPHERE_RADIUS),
    velocity: new THREE.Vector3()
  });

}

const worldOctree = new Octree();

const playerCollider = new Capsule(
  new THREE.Vector3(0, 5.35, 0),  // posición inicial start
  new THREE.Vector3(0, 6, 0),     // posición inicial end
  0.35                            // radio
);


const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let mouseTime = 0;
let playerHealth = 5;    // Vida inicial
let isPlayerDead = false;
function updateHealthBar() {
  const healthPercent = Math.max(playerHealth / 5, 0); // Vida máxima 5
  healthBar.style.width = (healthPercent * 100) + '%';

  if (healthPercent > 0.6) {
    healthBar.style.backgroundColor = '#0f0'; // Verde
  } else if (healthPercent > 0.3) {
    healthBar.style.backgroundColor = '#ff0'; // Amarillo
  } else {
    healthBar.style.backgroundColor = '#f00'; // Rojo
    death();
  }
}


const keyStates = {};

const vector1 = new THREE.Vector3();
const vector2 = new THREE.Vector3();
const vector3 = new THREE.Vector3();

document.addEventListener('keydown', (event) => {

  keyStates[event.code] = true;

});

document.addEventListener('keyup', (event) => {

  keyStates[event.code] = false;

});

container.addEventListener('mousedown', () => {

  document.body.requestPointerLock();

  mouseTime = performance.now();

});

document.addEventListener('mouseup', () => {

  if (document.pointerLockElement !== null) throwBall();

});

document.body.addEventListener('mousemove', (event) => {

  if (document.pointerLockElement === document.body) {

    camera.rotation.y -= event.movementX / 500;
    camera.rotation.x -= event.movementY / 500;

  }

});

window.addEventListener('resize', onWindowResize);

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function throwBallVR(controller) {
  const sphere = spheres[sphereIdx];
  
  // Usar la posición y orientación del controlador VR
  const controllerWorldPosition = new THREE.Vector3();
  controller.getWorldPosition(controllerWorldPosition);
  
  const controllerWorldDirection = new THREE.Vector3();
  controller.getWorldDirection(controllerWorldDirection);
  
  sphere.collider.center.copy(controllerWorldPosition).addScaledVector(controllerWorldDirection, 0.2);
  
  // Velocidad constante en VR para mejor experiencia
  sphere.velocity.copy(controllerWorldDirection).multiplyScalar(25);
  
  sphereIdx = (sphereIdx + 1) % spheres.length;
}
function playerCollisions() {

  const result = worldOctree.capsuleIntersect(playerCollider);

  playerOnFloor = false;

  if (result) {

    playerOnFloor = result.normal.y > 0;

    if (!playerOnFloor) {

      playerVelocity.addScaledVector(result.normal, - result.normal.dot(playerVelocity));

    }

    if (result.depth >= 1e-10) {

      playerCollider.translate(result.normal.multiplyScalar(result.depth));

    }

  }

}

function playerSphereCollision(sphere) {

  const center = vector1.addVectors(playerCollider.start, playerCollider.end).multiplyScalar(0.5);

  const sphere_center = sphere.collider.center;

  const r = playerCollider.radius + sphere.collider.radius;
  const r2 = r * r;

  // approximation: player = 3 spheres

  for (const point of [playerCollider.start, playerCollider.end, center]) {

    const d2 = point.distanceToSquared(sphere_center);

    if (d2 < r2) {

      const normal = vector1.subVectors(point, sphere_center).normalize();
      const v1 = vector2.copy(normal).multiplyScalar(normal.dot(playerVelocity));
      const v2 = vector3.copy(normal).multiplyScalar(normal.dot(sphere.velocity));

      playerVelocity.add(v2).sub(v1);
      sphere.velocity.add(v1).sub(v2);

      const d = (r - Math.sqrt(d2)) / 2;
      sphere_center.addScaledVector(normal, - d);

    }

  }

}

function spheresCollisions() {

  for (let i = 0, length = spheres.length; i < length; i++) {

    const s1 = spheres[i];

    for (let j = i + 1; j < length; j++) {

      const s2 = spheres[j];

      const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
      const r = s1.collider.radius + s2.collider.radius;
      const r2 = r * r;

      if (d2 < r2) {

        const normal = vector1.subVectors(s1.collider.center, s2.collider.center).normalize();
        const v1 = vector2.copy(normal).multiplyScalar(normal.dot(s1.velocity));
        const v2 = vector3.copy(normal).multiplyScalar(normal.dot(s2.velocity));

        s1.velocity.add(v2).sub(v1);
        s2.velocity.add(v1).sub(v2);

        const d = (r - Math.sqrt(d2)) / 2;

        s1.collider.center.addScaledVector(normal, d);
        s2.collider.center.addScaledVector(normal, - d);

      }

    }

  }

}

function updatePlayer(deltaTime) {
  let damping = Math.exp(- 4 * deltaTime) - 1;

  if (worldReady) {
    if (!playerOnFloor) {
      playerVelocity.y -= GRAVITY * deltaTime;
      damping *= 0.1;
    }
  }

  playerVelocity.addScaledVector(playerVelocity, damping);

  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerCollider.translate(deltaPosition);

  if (worldReady) {
    playerCollisions();
  }

  camera.position.copy(playerCollider.end);
}


function getForwardVector() {

  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();

  return playerDirection;

}

function getSideVector() {

  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  playerDirection.cross(camera.up);

  return playerDirection;

}

function controls(deltaTime) {

  if (renderer.xr.isPresenting) {
    // Movimiento basado en la dirección de la cabeza en VR
    const speedDelta = deltaTime * (playerOnFloor ? 10 : 5);
    const headDirection = new THREE.Vector3();
    camera.getWorldDirection(headDirection);
    headDirection.y = 0;
    headDirection.normalize();

  if (keyStates['KeyW']) {

    playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));

  }

  if (keyStates['KeyS']) {

    playerVelocity.add(getForwardVector().multiplyScalar(- speedDelta));

  }
 const sideDirection = new THREE.Vector3();
    camera.getWorldDirection(sideDirection);
    sideDirection.y = 0;
    sideDirection.normalize();
    sideDirection.cross(camera.up);

  if (keyStates['KeyA']) {

    playerVelocity.add(getSideVector().multiplyScalar(- speedDelta));

  }

  if (keyStates['KeyD']) {

    playerVelocity.add(getSideVector().multiplyScalar(speedDelta));

  }

  if (playerOnFloor) {

    if (keyStates['Space']) {

      playerVelocity.y = 10;

    }

  }

}
}

const loader = new GLTFLoader().setPath('modelos/');

loader.load('../modelos/la_ruina.glb', (gltf) => {

  scene.add(gltf.scene);

  worldOctree.fromGraphNode(gltf.scene);

  worldReady = true;

  function randomPosition(range = 40) {
    const x = (Math.random() - 0.5) * range;
    const z = (Math.random() - 0.5) * range;
    const y = 0; // suelo
    return new THREE.Vector3(x, y, z);
  }

  // Llamadas a cargar zombies con posiciones aleatorias
  const numZombies = 20; // o el número que quieras
  const zombieModels = ['../modelos/Zombie1.fbx'];

  for (let i = 0; i < numZombies; i++) {
    const model = zombieModels[i % zombieModels.length];
    loadZombie(model, randomPosition());
  }

  gltf.scene.traverse(child => {

    if (child.isMesh) {

      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material.map) {

        child.material.map.anisotropy = 4;

      }

    }
  });
  const helper = new OctreeHelper(worldOctree);
  helper.visible = false;
  scene.add(helper);

  const gui = new GUI({ width: 200 });
  gui.add({ debug: false }, 'debug')
    .onChange(function (value) {

      helper.visible = value;

    });

  function loadZombie(modelPath, position) {
    fbxLoader.setPath('modelos/').load(modelPath, (object) => {
      object.scale.set(0.008, 0.008, 0.008);
      object.position.copy(position);
      object.position.y -= 0.5;
      object.castShadow = true;
      scene.add(object);

      const zombie = {
        model: object,
        mixer: new THREE.AnimationMixer(object),
        actions: {},
        health: 3,
        currentAction: null,
        ready: false, // <-- Nueva bandera
      };
      zombie.sounds = {};
      const zombieListener = new THREE.AudioListener();
      camera.add(zombieListener);

      const zombieAudioLoader = new THREE.AudioLoader();

      // Cargar sonido de ataque
      zombieAudioLoader.load('../sonidos/atack.mp3', function (buffer) {
        zombie.sounds.attack = new THREE.Audio(zombieListener);
        zombie.sounds.attack.setBuffer(buffer);
        zombie.sounds.attack.setVolume(0.7);
      });

      // Cargar sonido de caminar
      zombieAudioLoader.load('../sonidos/zombie.mp3', function (buffer) {
        zombie.sounds.walk = new THREE.Audio(zombieListener);
        zombie.sounds.walk.setBuffer(buffer);
        zombie.sounds.walk.setVolume(0.5);
      });


      const actionsToLoad = {
        walk: '../modelos/Zombie_Running.fbx',
        attack: '../modelos/Zombie_Punching.fbx',
        die: '../modelos/Zombie_Death.fbx',
        idle: '../modelos/Zombie_Idle.fbx'
      };

      let animationsLoaded = 0;
      const totalAnimations = Object.keys(actionsToLoad).length;

      for (const [actionName, fileName] of Object.entries(actionsToLoad)) {
        fbxLoader.setPath('modelos/').load(fileName, (anim) => {
          const clip = anim.animations[0];
          const action = zombie.mixer.clipAction(clip);
          zombie.actions[actionName] = action;

          animationsLoaded++;
          if (animationsLoaded === totalAnimations) {
            zombie.ready = true; // <-- Ahora está listo
            zombie.actions.idle.play();
            zombie.currentAction = 'idle';
          }
        });
      }

      zombies.push(zombie);
    });
  }


});

function teleportPlayerIfOob() {

  if (camera.position.y <= - 25) {

    playerCollider.start.set(0, 0.35, 0);
    playerCollider.end.set(0, 1, 0);
    playerCollider.radius = 0.35;
    camera.position.copy(playerCollider.end);
    camera.rotation.set(0, 0, 0);
    playerHealth = 5;
    isPlayerDead = false;
    updateHealthBar();
  }

}

function updateSpheres(deltaTime) {
  for (const sphere of spheres) {
    // Si la esfera está "activa"
    if (sphere.collider.center.y > -50) {
      // Aplicar gravedad
      sphere.velocity.y -= GRAVITY * deltaTime;

      // Actualizar posición
      sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

      // Sin colisiones avanzadas, solo mueve la malla
      sphere.mesh.position.copy(sphere.collider.center);
    }
  }
}

function animate() {
  const delta = clock.getDelta();  // solo una vez
  for (const zombie of zombies) zombie.mixer.update(delta);

  const deltaTime = Math.min(0.05, delta) / STEPS_PER_FRAME;

  // we look for collisions in substeps to mitigate the risk of
  // an object traversing another too quickly for detection.

  for (let i = 0; i < STEPS_PER_FRAME; i++) {

    controls(deltaTime);
    updatePlayer(deltaTime);
    teleportPlayerIfOob();
    updateSpheres(deltaTime);
    checkProjectileZombieCollisions();
  }

  updateZombies(deltaTime);
  renderer.render(scene, camera);
  stats.update();

}

function updateZombies(deltaTime) {
  const playerPosition = camera.position;
  const moveSpeed = 1.5;

  for (const zombie of zombies) {
    if (!zombie.model) continue;

    // Mover hacia el jugador
    const direction = new THREE.Vector3();
    direction.subVectors(playerPosition, zombie.model.position).normalize();
    zombie.model.position.addScaledVector(direction, moveSpeed * deltaTime);

    // Separación entre zombis
    for (const otherZombie of zombies) {
      if (otherZombie === zombie || !otherZombie.model || otherZombie.health <= 0) continue;

      const d = zombie.model.position.distanceTo(otherZombie.model.position);
      const minDistance = 1.0;

      if (d < minDistance) {
        const pushDirection = new THREE.Vector3().subVectors(zombie.model.position, otherZombie.model.position).normalize();
        zombie.model.position.addScaledVector(pushDirection, (minDistance - d) * 0.5);
        otherZombie.model.position.addScaledVector(pushDirection, -(minDistance - d) * 0.5);
      }
    }

    if (!zombie.ready) continue;
    if (zombie.health <= 0) {
      if (zombie.currentAction !== 'die') {
        switchZombieAction(zombie, 'die');
      }

      if (!zombie.dyingTimer) zombie.dyingTimer = 1.5;
      zombie.dyingTimer -= deltaTime;

      if (zombie.dyingTimer <= 0) {
        if (!zombie.fallVelocity) zombie.fallVelocity = new THREE.Vector3(0, -5, 0);

        if (zombie.model.position.y > 0) {
          zombie.fallVelocity.y -= GRAVITY * deltaTime;
          zombie.model.position.y += zombie.fallVelocity.y * deltaTime;
        } else {
          zombie.model.position.y = 0;
          zombie.model.visible = false;
        }
      }
      continue;
    }

    const zombiePosition = zombie.model.position;
    const distance = zombiePosition.distanceTo(playerPosition);

    if (zombie.model.position.y > 0) {
      zombie.model.position.y -= GRAVITY * deltaTime;
      if (zombie.model.position.y < 0) zombie.model.position.y = 0;
    }

    if (distance < 15 && distance > 2) {
      if (zombie.currentAction !== 'walk') {
        switchZombieAction(zombie, 'walk');
      }
      const moveDir = new THREE.Vector3().subVectors(playerPosition, zombiePosition).normalize();
      zombie.model.position.addScaledVector(moveDir, deltaTime * 4);
      zombie.model.lookAt(playerPosition.x, zombiePosition.y, playerPosition.z);
    } else if (distance <= 2) {
      if (zombie.currentAction !== 'attack') {
        switchZombieAction(zombie, 'attack');
      }

      if (!isPlayerDead) {
        playerHealth -= deltaTime;
        updateHealthBar();
        if (playerHealth <= 0) {
          isPlayerDead = true;
          alert("DEATH");
        }
      }
    } else {
      if (zombie.currentAction !== 'idle') {
        switchZombieAction(zombie, 'idle');
      }
    }

    if (zombie.mixer) {
      zombie.mixer.update(deltaTime);
    }
  }
}
function death() {
  if (isPlayerDead) return;
  isPlayerDead = true;

  console.log("¡El jugador ha muerto!");
  healthBar.style.backgroundColor = '#000';
  healthBar.innerText = 'Muerto';

  // Mostrar botón de reinicio
  document.getElementById('deathText').innerText = '¡El jugador ha muerto!';
  document.getElementById('deathMessage').style.display = 'flex'; // o 'block'
  document.getElementById('restartBtn').style.display = 'block';
}


function checkProjectileZombieCollisions() {
  for (const sphere of spheres) {
    if (sphere.collider.center.y < -50) continue; // esfera inactiva

    for (const zombie of zombies) {
      if (!zombie.ready || zombie.health <= 0) continue;

      const distance = sphere.collider.center.distanceTo(zombie.model.position);
      if (distance < 1) {
        // Colisión detectada
        zombie.health -= 1;

        if (zombie.health <= 0) {
          if (zombie.currentAction !== 'die') {
            zombie.actions[zombie.currentAction]?.stop();
            zombie.actions.die.play();
            zombie.currentAction = 'die';
          }
        } else {
          // Reproduce sonido de ataque si está disponible
          if (zombie.sounds.attack && !zombie.sounds.attack.isPlaying) {
            zombie.sounds.attack.play();
          }
        }

        // Mueve la esfera fuera de la escena
        sphere.collider.center.set(0, -100, 0);
        sphere.mesh.position.copy(sphere.collider.center);
        break; // Evita múltiples colisiones por esfera
      }
    }
  }
}


function switchZombieAction(zombie, newAction) {
  if (zombie.currentAction === newAction || zombie.health <= 0) return;

  if (zombie.actions[zombie.currentAction]) {
    zombie.actions[zombie.currentAction].fadeOut(0.3);
  }

  const action = zombie.actions[newAction];
  if (action) {
    // Reproducir sonidos dependiendo de la acción
    if (zombie.sounds) {
      if (newAction === 'attack' && zombie.sounds.attack) {
        zombie.sounds.attack.play();
      } else if (newAction === 'walk' && zombie.sounds.walk) {
        if (!zombie.sounds.walk.isPlaying) {
          zombie.sounds.walk.play();
        }
      }
    }

    action.reset();
    action.fadeIn(0.3).play();
    zombie.currentAction = newAction;
  }
}
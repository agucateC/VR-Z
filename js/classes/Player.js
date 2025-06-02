import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.health = 5;
    this.maxHealth = 5;
    this.isDead = false;
    this.keyStates = {};
    this.GRAVITY = 9.8;
    this.moveSpeed = 5;
    this.jumpForce = 8;
    this.maxSpeed = 5;
    this.airControlFactor = 0.5;
    this.friction = 0.9;
    this.lastSafePosition = new THREE.Vector3();

    this.initCamera();
    this.initCollider();
    this.initControls();
    this.initEventListeners();
    this.initDebugVisualization();
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.rotation.order = 'YXZ';
    this.cameraGroup = new THREE.Group();
    this.cameraGroup.position.set(0, 1.6, 0);
    this.game.sceneManager.scene.add(this.cameraGroup);
  }

  initCollider() {
    this.collider = new Capsule(
      new THREE.Vector3(0, 1.35, 0),
      new THREE.Vector3(0, 1.8, 0),
      0.35
    );
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.playerOnFloor = false;
    this.lastSafePosition.copy(this.collider.end);
  }

  initControls() {
    try {
      // 1. Inicialización de controls con verificación
      this.controls = new PointerLockControls(this.camera, document.body);
      if (!this.controls) {
        throw new Error('No se pudo inicializar PointerLockControls');
      }

      this.cameraGroup.add(this.controls.getObject());

      let isLocked = false;
      let clickHandler = () => {
        if (!isLocked && this.controls?.lock) {
          this.controls.lock()
            .then(() => {
              isLocked = true;
              document.body.style.cursor = 'none';
            })
            .catch(err => {
              isLocked = false;
              console.warn('Error al bloquear puntero:', err);
            });
        }
      };

      // 2. Manejador de eventos mejorado
      document.body.addEventListener('click', clickHandler);

      // 3. Manejo de cambios en el pointer lock
      document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === document.body;
        document.body.style.cursor = isLocked ? 'none' : 'default';

        // Opcional: Pausar el juego cuando se pierde el foco
        if (!isLocked && !this.game.gamePaused) {
          this.game.togglePause();
        }
      });

    } catch (error) {
      console.error('Error al inicializar controles:', error);
      // Fallback: Controles básicos sin pointer lock
      this.setupBasicControls();
    }
  }

  // Método de fallback opcional
  setupBasicControls() {
    console.warn('Usando controles básicos (sin Pointer Lock)');
    // Implementación alternativa de controles aquí
  }

  initEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.game.gamePaused && !this.isDead) {
        this.keyStates[e.code] = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keyStates[e.code] = false;
    });

    document.addEventListener('mousedown', () => {
      if (!this.game.gamePaused && !this.isDead &&
        document.pointerLockElement === document.body) {
        this.game.projectileManager.throwBall(this.getThrowDirection());
      }
    });
  }

  initDebugVisualization() {
    if (this.game.debugMode) {
      this.colliderHelper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.35, 1.8 - 0.35 * 2),
        new THREE.MeshBasicMaterial({
          wireframe: true,
          color: 0xff0000,
          transparent: true,
          opacity: 0.5
        })
      );
      this.game.sceneManager.scene.add(this.colliderHelper);
    }
  }

  update(deltaTime) {
    if (this.game.gamePaused || this.isDead) return;

    this.playerOnFloor = this.checkIfOnFloor(); 
    this.handleMovement(deltaTime);
    this.checkCollisions();
    this.checkWorldBounds();
    this.updateCameraPosition();
    this.checkFallDamage();
    this.updateDebugVisualization();
  }

  handleMovement(deltaTime) {
    const speedFactor = this.playerOnFloor ? 1 : this.airControlFactor;
    const speedDelta = deltaTime * this.moveSpeed * speedFactor;

    // Aplicar fricción solo en el suelo
    if (this.playerOnFloor) {
      this.velocity.x *= this.friction;
      this.velocity.z *= this.friction;
    }

    // Movimiento WASD relativo a la cámara
    if (this.keyStates['KeyW']) {
      this.velocity.add(this.getForwardVector().multiplyScalar(speedDelta));
    }
    if (this.keyStates['KeyS']) {
      this.velocity.add(this.getForwardVector().multiplyScalar(-speedDelta));
    }
    if (this.keyStates['KeyA']) {
      this.velocity.add(this.getSideVector().multiplyScalar(-speedDelta));
    }
    if (this.keyStates['KeyD']) {
      this.velocity.add(this.getSideVector().multiplyScalar(speedDelta));
    }

    // Limitar velocidad horizontal
    const horizontalVelocity = new THREE.Vector3(this.velocity.x, 0, this.velocity.z);
    if (horizontalVelocity.length() > this.maxSpeed) {
      horizontalVelocity.normalize().multiplyScalar(this.maxSpeed);
      this.velocity.x = horizontalVelocity.x;
      this.velocity.z = horizontalVelocity.z;
    }

    // Salto
    if (this.playerOnFloor && this.keyStates['Space']) {
      this.velocity.y = this.jumpForce;
      this.playerOnFloor = false;
    }

    // Gravedad
    if (!this.playerOnFloor) {
      this.velocity.y -= this.GRAVITY * deltaTime;
    }

    // Movimiento final
    const deltaPosition = this.velocity.clone().multiplyScalar(deltaTime);
    this.collider.translate(deltaPosition);
  }

  checkIfOnFloor() {
    const rayOrigin = this.collider.end.clone();
    const rayDirection = new THREE.Vector3(0, -1, 0);
    const raycaster = new THREE.Raycaster(rayOrigin, rayDirection, 0, 0.15);

    const intersects = raycaster.intersectObjects(this.game.sceneManager.scene.children, true);
    return intersects.length > 0;
  }

  checkCollisions() {
    const result = this.game.sceneManager.worldOctree.capsuleIntersect(this.collider);

    this.playerOnFloor = false;

    if (result) {
      if (result.normal.y > 0.5) this.playerOnFloor = true;

      // Corrección de posición
      const correction = result.normal.clone().multiplyScalar(result.depth * 1.01);
      this.collider.translate(correction);

      // Corrección de velocidad (rebote)
      const velocityDotNormal = this.velocity.dot(result.normal);
      if (velocityDotNormal < 0) {
        const bounceStrength = Math.min(-velocityDotNormal * 0.8, 5);
        this.velocity.addScaledVector(result.normal, bounceStrength);
      }

      // Guardar posición segura si estamos en el suelo
      if (this.playerOnFloor) {
        this.lastSafePosition.copy(this.collider.end);
      }
    }
  }

  checkWorldBounds() {
    const bounds = this.game.sceneManager.worldBounds;
    const position = this.collider.end;

    // Verificar límites del mundo
    if (position.x < bounds.min.x || position.x > bounds.max.x ||
      position.z < bounds.min.z || position.z > bounds.max.z ||
      position.y < bounds.min.y) {
      this.resetToSafePosition();
    }
  }

  checkFallDamage() {
    if (this.collider.start.y < -25) {
      this.takeDamage(this.maxHealth);
      this.resetToSafePosition();
    }
  }

  resetToSafePosition() {
    this.collider.start.copy(this.lastSafePosition);
    this.collider.start.y -= 0.45;
    this.collider.end.copy(this.lastSafePosition);
    this.velocity.set(0, 0, 0);
    this.updateCameraPosition();
  }

  updateCameraPosition() {
    this.cameraGroup.position.copy(this.collider.end);
  }

  updateDebugVisualization() {
    if (this.colliderHelper) {
      this.colliderHelper.position.copy(this.collider.end);
      this.colliderHelper.position.y -= (1.8 - 0.35) / 2;
    }
  }

  getForwardVector() {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();
    return this.direction;
  }

  getSideVector() {
    this.camera.getWorldDirection(this.direction);
    this.direction.y = 0;
    this.direction.normalize();
    this.direction.cross(this.camera.up);
    return this.direction;
  }

  getThrowDirection() {
    this.camera.getWorldDirection(this.direction);
    return this.direction.clone().normalize();
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.health -= amount;
    this.game.uiManager.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.controls.unlock();
    this.game.uiManager.showDeathScreen();
  }

  reset() {
    this.health = this.maxHealth;
    this.isDead = false;
    this.collider.start.set(0, 1.35, 0);
    this.collider.end.set(0, 1.8, 0);
    this.velocity.set(0, 0, 0);
    this.lastSafePosition.set(0, 1.8, 0);
    this.game.uiManager.updateHealthBar();
    this.updateCameraPosition();
  }
}
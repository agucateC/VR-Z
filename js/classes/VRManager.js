import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export class VRManager {
  constructor(game) {
    this.game = game;
    this.controllers = [];
    this.controllerModelFactory = new XRControllerModelFactory();

    this.initVR();
  }

  initVR() {
  // Asegura tipo de espacio antes de iniciar sesión
  this.game.renderer.xr.setReferenceSpaceType('local-floor');

  // Agrega botón VR (maneja session automáticamente)
  document.body.appendChild(VRButton.createButton(this.game.renderer));

  // Evento al iniciar sesión VR
  this.game.renderer.xr.addEventListener('sessionstart', () => {
    this.onSessionStart();
  });

  // Loop de animación para VR y no-VR
  this.game.renderer.setAnimationLoop(() => {
    if (this.game.renderer.xr.isPresenting) {
      this.game.animate();
    } else {
      this.game.renderer.render(this.game.sceneManager.scene, this.game.player.camera);
    }
  });
}


  onSessionStart() {
    this.setupControllers();
    this.resetVRCameraPosition();
  }

  setupControllers() {
    // Limpiar controles previos
    this.controllers.forEach(controller => {
      this.game.sceneManager.scene.remove(controller);
    });
    this.controllers = [];

    // Crear controles para ambas manos (0: izquierda, 1: derecha)
    for (let i = 0; i < 2; i++) {
      const controller = this.game.renderer.xr.getController(i);
      controller.addEventListener('selectstart', () => this.onTriggerPressed(controller));
      this.game.sceneManager.scene.add(controller);

      const controllerGrip = this.game.renderer.xr.getControllerGrip(i);
      controllerGrip.add(this.controllerModelFactory.createControllerModel(controllerGrip));
      this.game.sceneManager.scene.add(controllerGrip);

      this.controllers.push(controller);
    }
  }

  onTriggerPressed(controller) {
    if (this.game.gamePaused) return;
    this.game.projectileManager.throwBallVR(controller);
    this.triggerHapticFeedback(controller);
  }

  triggerHapticFeedback(controller) {
    const session = this.game.renderer.xr.getSession();
    if (session && session.inputSources) {
      const source = session.inputSources[this.controllers.indexOf(controller)];
      if (source?.gamepad?.hapticActuators?.[0]) {
        source.gamepad.hapticActuators[0].pulse(0.8, 100);
      }
    }
  }

  resetVRCameraPosition() {
  // Sincroniza cameraGroup con la cápsula del jugador
  const playerY = this.game.player.collider.end.y;
  this.game.player.cameraGroup.position.set(0, playerY, 0);
  this.game.player.cameraGroup.rotation.set(0, 0, 0);
}


  getControllerWorldPosition(controllerIndex) {
    const position = new THREE.Vector3();
    this.controllers[controllerIndex].getWorldPosition(position);
    return position;
  }

  getControllerWorldDirection(controllerIndex) {
    const direction = new THREE.Vector3();
    this.controllers[controllerIndex].getWorldDirection(direction);
    return direction;
  }
}
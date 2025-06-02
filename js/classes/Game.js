import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { Player } from './Player.js';
import { ZombieManager } from './ZombieManager.js';
import { ProjectileManager } from './ProjectileManager.js';
import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';
import { VRManager } from './VRManager.js'

export class Game {
  constructor() {
    // Configuración básica
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.xr.enabled = true;
    
    this.clock = new THREE.Clock();
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.domContainer = document.getElementById('container');
    this.domContainer.appendChild(this.renderer.domElement);
    this.domContainer.appendChild(this.stats.dom);

    // Subsistemas
    this.sceneManager = new SceneManager(this);
    this.player = new Player(this);
    this.zombieManager = new ZombieManager(this);
    this.projectileManager = new ProjectileManager(this);
    this.uiManager = new UIManager(this);
    this.audioManager = new AudioManager(this);
    this.vrManager = new VRManager(this);


    this.gamePaused = false;
    this.worldReady = false;
    this.animationFrameId = null;

    this.initEventListeners();
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.togglePause();
    });
  }

  start() {
    this.uiManager.hideStartScreen();
    this.animate();
  }

  startVR() {
  if (!navigator.xr) {
    alert('WebXR no está disponible en tu navegador');
    return;
  }
  this.vrManager.initVR();
  
    this.renderer.xr.setSession(this.renderer.xr.getSession())
      .then(() => this.animate())
      .catch(console.error);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    
    if (this.gamePaused) return;
    
    const delta = this.clock.getDelta();
    
    // Actualización de sistemas
    this.player.update(delta);
    this.zombieManager.update(delta);
    this.projectileManager.update(delta);
    
    // Renderizado
    if (this.renderer.xr.isPresenting) {
      this.renderer.render(this.sceneManager.scene, this.player.camera);
    } else {
      this.renderer.setAnimationLoop(() => {
        this.renderer.render(this.sceneManager.scene, this.player.camera);
      });
    }
    
    this.stats.update();
  }

  togglePause() {
    this.gamePaused = !this.gamePaused;
    this.uiManager.togglePauseScreen(this.gamePaused);
    
    if (this.gamePaused) {
      cancelAnimationFrame(this.animationFrameId);
    } else {
      this.animate();
    }
  }

  onWindowResize() {
    if (this.renderer.xr.isPresenting) return;
    
    this.player.camera.aspect = window.innerWidth / window.innerHeight;
    this.player.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  resetGame() {
    // Lógica para reiniciar el juego completamente
    this.player.reset();
    this.zombieManager.reset();
    this.projectileManager.reset();
    this.uiManager.reset();
  }
}
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class ZombieManager {
  constructor(game) {
    this.game = game;
    this.zombies = [];
    this.zombiesKilled = 0;
    this.loader = new FBXLoader();
    this.animations = {};

    this.initZombies();
  }

  async initZombies() {
    if (this.waveTimer) clearInterval(this.waveTimer);

    await this.loadAnimations();
    this.wave = 1;
    this.maxWave = 15;
    this.spawnInterval = 10000; // 10 segundos por ola

    this.spawnWave(); // ola inicial

    this.waveTimer = setInterval(() => {
      this.wave++;
      if (this.wave <= this.maxWave) {
        this.spawnWave();
      } else {
        clearInterval(this.waveTimer);
      }
    }, this.spawnInterval);
  }


  loadAnimations() {
    const animationFiles = {
      walk: 'Zombie_Running.fbx',
      attack: 'Zombie_Punching.fbx',
      die: 'Zombie_Death.fbx',
      idle: 'Zombie_Idle.fbx'
    };

    return Promise.all(
      Object.entries(animationFiles).map(([name, file]) =>
        this.loadAnimation(`assets/models/${file}`).then(clip => {
          this.animations[name] = clip;
        })
      )
    );
  }

  loadAnimation(path) {
    return new Promise((resolve) => {
      this.loader.load(path, (fbx) => resolve(fbx.animations[0]));
    });
  }

  spawnZombie(position) {
    this.loader.load('assets/models/Zombie1.fbx', (object) => {
      object.scale.set(0.008, 0.008, 0.008);
      object.position.copy(position);

      const zombie = {
        model: object,
        mixer: new THREE.AnimationMixer(object),
        actions: {},
        health: 3,
        currentAction: null,
        position: position.clone(),
        target: this.game.player,
        speed: 1.5,
        attackDamage: 0.5,
        attackCooldown: 1,
        lastAttack: 0
      };

      // Configurar animaciones
      Object.keys(this.animations).forEach(name => {
        zombie.actions[name] = zombie.mixer.clipAction(this.animations[name]);
        zombie.actions[name].clampWhenFinished = true;
      });

      this.game.sceneManager.scene.add(object);
      this.zombies.push(zombie);
      this.switchAction(zombie, 'idle');
    });
  }

  update(delta) {
    this.zombies.forEach(zombie => {
      if (zombie.health <= 0) {
        this.updateDeadZombie(zombie, delta);
        return;
      }

      this.updateAliveZombie(zombie, delta);
      zombie.mixer.update(delta);
    });

    // Eliminar zombies muertos
    this.zombies = this.zombies.filter(z => !z.shouldRemove);
    
  }

  updateAliveZombie(zombie, delta) {
    const distance = zombie.model.position.distanceTo(zombie.target.collider.end);

    if (distance < 15 && distance > 1.5) {
      // Perseguir al jugador
      if (zombie.currentAction !== 'walk') {
        this.switchAction(zombie, 'walk');
      }

      const direction = new THREE.Vector3()
        .subVectors(zombie.target.collider.end, zombie.model.position)
        .normalize();

      zombie.model.position.addScaledVector(direction, zombie.speed * delta);
      zombie.model.lookAt(
        zombie.target.collider.end.x,
        zombie.model.position.y,
        zombie.target.collider.end.z
      );
    }
    else if (distance <= 1.5) {
      // Atacar al jugador
      if (zombie.currentAction !== 'attack') {
        this.switchAction(zombie, 'attack');
      }

      zombie.lastAttack += delta;
      if (zombie.lastAttack >= zombie.attackCooldown) {
        zombie.target.takeDamage(zombie.attackDamage);
        zombie.lastAttack = 0;
      }
    }
    else {
      // Estado inactivo
      if (zombie.currentAction !== 'idle') {
        this.switchAction(zombie, 'idle');
      }
    }
  }

  updateDeadZombie(zombie, delta) {
    if (zombie.currentAction !== 'die') {
      this.switchAction(zombie, 'die');
      zombie.deathTimer = 2.0; // Tiempo antes de desaparecer
    }

    zombie.deathTimer -= delta;
    if (zombie.deathTimer <= 0) {
      zombie.shouldRemove = true;
      this.game.sceneManager.scene.remove(zombie.model);
    }
  }
  spawnWave() {
     if (this.wave > this.maxWave) return;
    for (let i = 0; i < this.wave; i++) {
      this.spawnZombie(this.randomPosition());
    }
  }


  switchAction(zombie, newAction) {
    if (zombie.currentAction === newAction) return;

    const current = zombie.actions[zombie.currentAction];
    const next = zombie.actions[newAction];

    if (current) current.fadeOut(0.2);
    if (next) {
      next.reset().fadeIn(0.2).play();
      zombie.currentAction = newAction;
    }
  }

  randomPosition(range = 40) {
    return new THREE.Vector3(
      (Math.random() - 0.5) * range,
      0,
      (Math.random() - 0.5) * range
    );
  }

  onZombieKilled() {
    this.zombiesKilled++;
    this.game.uiManager.updateZombieCounter();
  }

  async reset() {
    clearInterval(this.waveTimer);
    this.zombies.forEach(z => {
      this.game.sceneManager.scene.remove(z.model);
    });
    this.zombies = [];
    this.zombiesKilled = 0;
    await this.initZombies();
  }
}
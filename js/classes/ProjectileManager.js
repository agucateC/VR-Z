import * as THREE from 'three';
export class ProjectileManager {
  constructor(game) {
    this.game = game;
    this.spheres = [];
    this.sphereIdx = 0;
    this.SPHERE_RADIUS = 0.1;
    this.NUM_SPHERES = 100;
    this.GRAVITY = 30;
    
    this.initSpheres();
  }

  initSpheres() {
    const geometry = new THREE.IcosahedronGeometry(this.SPHERE_RADIUS, 5);
    const material = new THREE.MeshLambertMaterial({ color: 0xdede8d });
    
    for (let i = 0; i < this.NUM_SPHERES; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.visible = false;
      
      this.game.sceneManager.scene.add(mesh);
      
      this.spheres.push({
        mesh,
        collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), this.SPHERE_RADIUS),
        velocity: new THREE.Vector3()
      });
    }
  }

  throwBall(direction) {
    if (this.game.gamePaused) return;
    
    const sphere = this.spheres[this.sphereIdx];
    sphere.collider.center.copy(this.game.player.collider.end)
      .addScaledVector(direction, 0.5);
    
    sphere.velocity.copy(direction).multiplyScalar(20);
    sphere.mesh.position.copy(sphere.collider.center);
    sphere.mesh.visible = true;
    
    this.sphereIdx = (this.sphereIdx + 1) % this.NUM_SPHERES;
  }

  update(delta) {
    for (const sphere of this.spheres) {
      if (sphere.collider.center.y < -50) continue;
      
      // Aplicar gravedad
      sphere.velocity.y -= this.GRAVITY * delta;
      
      // Mover esfera
      sphere.collider.center.addScaledVector(sphere.velocity, delta);
      sphere.mesh.position.copy(sphere.collider.center);
      
      // Rotar para efecto visual
      sphere.mesh.rotation.x += delta * 5;
      sphere.mesh.rotation.y += delta * 5;
      
      // Verificar colisiones
      this.checkCollisions(sphere);
    }
  }

  checkCollisions(sphere) {
    for (const zombie of this.game.zombieManager.zombies) {
      if (zombie.health <= 0) continue;
      
      const distance = sphere.collider.center.distanceTo(zombie.model.position);
      if (distance < 1.0) {
        zombie.health -= 1;
        
        if (zombie.health <= 0) {
          this.game.zombieManager.onZombieKilled();
        }
        
        // Desactivar esfera
        sphere.collider.center.set(0, -100, 0);
        sphere.mesh.visible = false;
        break;
      }
    }
  }

  reset() {
    this.spheres.forEach(sphere => {
      sphere.collider.center.set(0, -100, 0);
      sphere.mesh.visible = false;
    });
    this.sphereIdx = 0;
  }
}
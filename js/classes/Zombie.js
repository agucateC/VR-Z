export class Zombie {
  constructor(game, position) {
    this.game = game;
    this.model = null;
    this.health = 3;
    this.position = position.clone();
    this.shouldRemove = false;
    
    this.loadModel();
    this.setupAnimations();
  }
  
  update(delta) {
    if (this.health <= 0) {
      this.handleDeath(delta);
      return;
    }
    
    this.moveTowardsPlayer(delta);
    this.updateAnimation();
  }
  
  takeDamage(amount) {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.game.zombieManager.registerZombieKill();
    }
  }
  
  // ... otros métodos específicos del zombie
}
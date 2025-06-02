export class UIManager {
  constructor(game) {
    this.game = game;
    this.domContainer = game.domContainer;
    
    this.initUI();
  }

  initUI() {
    // Crear elementos del HUD
    this.createHealthBar();
    this.createZombieCounter();
    this.createMenuScreens();
    
    // Configurar event listeners
    document.getElementById('startBtn').addEventListener('click', () => this.game.start());
    document.getElementById('vrBtn').addEventListener('click', () => this.game.startVR());
    document.getElementById('resumeBtn').addEventListener('click', () => this.game.togglePause());
    document.getElementById('quitBtn').addEventListener('click', () => location.reload());
    document.getElementById('restartBtn').addEventListener('click', () => this.game.resetGame());
  }

  createHealthBar() {
    this.healthBarContainer = document.createElement('div');
    this.healthBarContainer.className = 'health-bar-container';
    
    this.healthBar = document.createElement('div');
    this.healthBar.className = 'health-bar';
    
    this.healthBarContainer.appendChild(this.healthBar);
    this.domContainer.appendChild(this.healthBarContainer);
    
    this.updateHealthBar();
  }

  updateHealthBar() {
    const percent = (this.game.player.health / this.game.player.maxHealth) * 100;
    this.healthBar.style.width = `${percent}%`;
    
    if (percent > 60) {
      this.healthBar.style.backgroundColor = '#0f0';
    } else if (percent > 30) {
      this.healthBar.style.backgroundColor = '#ff0';
    } else {
      this.healthBar.style.backgroundColor = '#f00';
    }
  }

  createZombieCounter() {
    this.zombieCounter = document.createElement('div');
    this.zombieCounter.className = 'zombie-counter';
    this.domContainer.appendChild(this.zombieCounter);
    this.updateZombieCounter();
  }

  updateZombieCounter() {
    this.zombieCounter.textContent = `Zombies: ${this.game.zombieManager.zombiesKilled}`;
  }

  createMenuScreens() {
    // Pantalla de inicio
    this.startScreen = document.getElementById('startScreen');
    
    // Pantalla de pausa
    this.pauseScreen = document.getElementById('pauseScreen');
    
    // Pantalla de muerte
    this.deathScreen = document.getElementById('deathMessage');
  }

  hideStartScreen() {
    this.startScreen.style.display = 'none';
    document.getElementById('hud').style.display = 'block';
  }

  showDeathScreen() {
    document.getElementById('deathText').textContent = '¡Has muerto!';
    this.deathScreen.style.display = 'flex';
    document.getElementById('restartBtn').style.display = 'block';
  }

  togglePauseScreen(show) {
    this.pauseScreen.style.display = show ? 'flex' : 'none';
  }

  reset() {
    this.deathScreen.style.display = 'none';
    this.updateHealthBar();
    this.updateZombieCounter();
  }
}
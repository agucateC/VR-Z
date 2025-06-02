
import { Game } from './classes/Game.js';

// Inicialización del juego
const game = new Game();

// Configurar event listeners globales (podría moverse a UIManager)
document.getElementById('startBtn').addEventListener('click', () => game.start());
document.getElementById('vrBtn').addEventListener('click', () => game.startVR());
document.getElementById('resumeBtn').addEventListener('click', () => game.togglePause());
document.getElementById('quitBtn').addEventListener('click', () => location.reload());
document.getElementById('restartBtn').addEventListener('click', () => game.resetGame());

// Evento de pausa con ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') game.togglePause();
});

// Si necesitas acceder al juego desde la consola para debugging
window.game = game;
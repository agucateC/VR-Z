import * as THREE from 'three';
export class AudioManager {
  constructor(game) {
    this.game = game;
    this.sounds = {};
    
    this.initAudio();
    this.loadSounds();
  }

  initAudio() {
    this.listener = new THREE.AudioListener();
    this.game.player.camera.add(this.listener);
    this.audioLoader = new THREE.AudioLoader();
  }

  loadSounds() {
    this.loadSound('background', '../assets/sounds/ambiente.mp3', { loop: true, volume: 0.5 });
    this.loadSound('zombieAttack', '../assets/sounds/atack.mp3');
    this.loadSound('zombieWalk', '../assets/sounds/zombie.mp3');
  }

  loadSound(name, path, options = {}) {
    this.audioLoader.load(path, buffer => {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      sound.setLoop(options.loop || false);
      sound.setVolume(options.volume || 1.0);
      
      this.sounds[name] = sound;
      
      if (options.autoplay) {
        sound.play();
      }
    });
  }

  playSound(name) {
    if (this.sounds[name] && !this.sounds[name].isPlaying) {
      this.sounds[name].play();
    }
  }

  stopSound(name) {
    if (this.sounds[name] && this.sounds[name].isPlaying) {
      this.sounds[name].stop();
    }
  }

  setVolume(name, volume) {
    if (this.sounds[name]) {
      this.sounds[name].setVolume(volume);
    }
  }
}
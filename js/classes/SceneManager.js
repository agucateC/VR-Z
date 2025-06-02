import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class SceneManager {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.worldOctree = new Octree();
    this.helper = new OctreeHelper(this.worldOctree);
    this.worldBounds = {
      min: new THREE.Vector3(-50, -5, -50),
      max: new THREE.Vector3(50, 50, 50)
    };
    
    this.setupScene();
    this.loadWorld();
    this.setupInvisibleWalls();
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x88ccee);
    this.scene.fog = new THREE.Fog(0x88ccee, 0, 50);
    
    // Luces mejoradas
    this.setupLights();
    
    // Helper (debug)
    this.helper.visible = false;
    this.scene.add(this.helper);
  }

  setupLights() {
    // Luz ambiental mejorada
    const ambientLight = new THREE.HemisphereLight(0x8dc1de, 0x00668d, 1.5);
    ambientLight.position.set(2, 1, 1);
    this.scene.add(ambientLight);
    
    // Luz direccional principal con mejores sombras
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(-5, 25, -1);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);
    
    // Luz de relleno
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.75);
    fillLight.position.set(5, 10, 5);
    this.scene.add(fillLight);
  }

  setupInvisibleWalls() {
    // Piso invisible más grande que el mundo visible
    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    this.scene.add(floor);
    this.worldOctree.fromGraphNode(floor);

    // Paredes invisibles con física
    const wallThickness = 5;
    const wallHeight = 30;
    const wallGeometry = new THREE.BoxGeometry(100, wallHeight, wallThickness);
    const wallMaterial = new THREE.MeshBasicMaterial({ visible: false });
    
    const walls = [
      { position: [0, wallHeight/2, 50], rotation: [0, 0, 0] },    // Norte
      { position: [0, wallHeight/2, -50], rotation: [0, 0, 0] },   // Sur
      { position: [50, wallHeight/2, 0], rotation: [0, Math.PI/2, 0] }, // Este
      { position: [-50, wallHeight/2, 0], rotation: [0, Math.PI/2, 0] }  // Oeste
    ];

    walls.forEach(wall => {
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
      wallMesh.position.set(...wall.position);
      wallMesh.rotation.set(...wall.rotation);
      this.scene.add(wallMesh);
      this.worldOctree.fromGraphNode(wallMesh);
    });
  }

  loadWorld() {
    const loader = new GLTFLoader();
    
    loader.load('../assets/models/la_ruina.glb', 
      (gltf) => {
        this.onWorldLoadSuccess(gltf);
      },
      undefined,
      (error) => {
        console.error('Error al cargar el modelo:', error);
        this.setupBasicCollisionFallback();
      }
    );
  }

  onWorldLoadSuccess(gltf) {
    this.scene.add(gltf.scene);
    
    // Configuración óptima de materiales y sombras
    gltf.scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Optimización de materiales
        if (child.material) {
          if (child.material.map) {
            child.material.map.anisotropy = 4;
          }
          child.material.shadowSide = THREE.FrontSide;
        }
      }
    });
    
    // Construcción del Octree con manejo de errores
    try {
      this.worldOctree.fromGraphNode(gltf.scene);
      console.log('Octree construido correctamente con', 
        this.worldOctree.triangles.length, 'triángulos');
      this.game.worldReady = true;
    } catch (error) {
      console.error('Error al construir Octree:', error);
      this.setupBasicCollisionFallback();
    }
  }

  setupBasicCollisionFallback() {
    console.warn('Usando colisión de fallback básica');
    
    // Terreno básico
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a5f0b,
      wireframe: false
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Colisiones básicas
    this.worldOctree.fromGraphNode(ground);
    this.game.worldReady = true;
  }

  toggleDebug(visible) {
    this.helper.visible = visible;
    if (visible) {
      this.helper.update();
    }
  }

  update() {
    // Futuras actualizaciones de escena si son necesarias
  }
}
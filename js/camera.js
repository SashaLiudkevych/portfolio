import * as THREE from "three";

// Створення камери
export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );

  const baseCameraPosition = new THREE.Vector3(-2.23, 1.15, 4.30);
const cameraTarget = new THREE.Vector3(1.06, 1.79, -2.40);
  
  camera.position.copy(baseCameraPosition);
  camera.lookAt(cameraTarget);

  return { camera, baseCameraPosition, cameraTarget };
}

// Створення рендерера
export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  return renderer;
}

// Обробка зміни розміру вікна
export function setupResizeHandler(camera, renderer, composer) {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });
}
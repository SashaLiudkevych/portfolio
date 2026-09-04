import * as THREE from "three";

// Створення камери
export function createCamera() {
  const isMobile = window.innerWidth < 768;
  const initialFov = isMobile ? 90 : 70;

  const camera = new THREE.PerspectiveCamera(
    initialFov,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );

  const baseCameraPosition = new THREE.Vector3(-2.34, 1.40, 4.19);
  const cameraTarget = new THREE.Vector3(1.90, 2.04, -1.95);
  
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
    // Автоматично адаптуємо FOV при переході між мобільним та десктопним режимами (наприклад, при повороті екрана)
    const isMobile = window.innerWidth < 768;
    camera.fov = isMobile ? 90 : 70;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });
}
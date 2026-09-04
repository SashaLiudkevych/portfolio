import * as THREE from "three";
import { EXRLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/EXRLoader.js";

export function setupEnvironment(renderer, scene, onProgressUpdate) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // 1. Додаємо просте заповнююче біле світло для об'єму та читабельності моделі
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // Контрове світло ззаду для кращого відділення моделей
  const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
  backLight.position.set(-10, 10, -10);
  scene.add(backLight);

  // 2. Завантаження EXR для відблисків на матеріалах (environment) та фону (background)
  new EXRLoader().load(
    './glb_export/environment.exr',
    (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      
      scene.environment = envMap;
      scene.environmentIntensity = 0.4;
      
      scene.background = envMap;
      scene.backgroundIntensity = 0.7; // Можеш зменшити тут, якщо фон занадто яскравий

      texture.dispose();
      pmremGenerator.dispose();

      if (onProgressUpdate) onProgressUpdate(100);
    },
    (xhr) => {
      if (xhr.total && onProgressUpdate) {
        const progress = Math.floor((xhr.loaded / xhr.total) * 100);
        onProgressUpdate(progress);
      }
    },
    (error) => {
      console.error("Failed to load EXR environment map:", error);
      if (onProgressUpdate) onProgressUpdate(100);
    }
  );

  // Повертаємо об'єкт світла, якщо тобі захочеться керувати інтенсивністю ззовні (наприклад, через слайдери)
  return { ambientLight, dirLight, backLight };
}
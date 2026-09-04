import * as THREE from "three";
import { EXRLoader } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/EXRLoader.js";

export function setupEnvironment(renderer, scene, onProgressUpdate) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  new EXRLoader().load(
    './glb_export/environment.exr',
    (texture) => {
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envMap;
      scene.environmentIntensity = 1.0;
      scene.background = envMap;
      scene.backgroundIntensity = 0.8;

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
}
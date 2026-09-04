import * as THREE from "three";
import { globalClayMaterial } from "./materials.js";

export const INTERACTIVE_OBJECTS = [
  {
    meshName: "sofa", 
    title: "Modern Sofa", 
    description: "Modern sofa for your pool area", 
    shopUrl: "https://prom.ua/ua/search?search_term=sofa",
    camOffset: { x: -1.16, y: 0.56, z: 1.34 },
    targetOffset: { x: 0, y: 0.2, z: 0 }
  },
  {
    meshName: "Plane001", 
    title: "Painting", 
    description: "Modern painting for wall", 
    shopUrl: "https://www.saatchiart.com/art/Painting-Tornadic-Man/738587/12189883/view",
    camOffset: { x: 0.04, y: -0.34, z: 3.01 },
    targetOffset: { x: 0, y: 0.2, z: 0 }
  },
  {
    meshName: "ball",
    title: "Pool Flamingo",
    description: "Pool flamingo for kids",
    shopUrl: "https://prom.ua/Naduvnoj-flamingo.html",
    camOffset: { x: -0.72, y: 0.51, z: 1.06 },
    targetOffset: { x: 0, y: 0, z: 0 }
  },
  {
    meshName: "lamp",
    title: "Outdoor Lamp",
    description: "LED street lantern with soft diffused light.",
    shopUrl: "https://example.com/shop/lamp",
    camOffset: { x: 1.0, y: 1.0, z: 1.5 },
    targetOffset: { x: 0, y: 0.4, z: 0 }
  }
];

export function setupInteractivity(scene, camera, renderer, onOpenModal) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-1000, -1000);

  let hoveredMesh = null;
  const originalScales = new Map();
  let interactiveMeshes = [];

  const turquoiseColor = new THREE.Color(0x2AD4B4);

  function findInteractiveConfig(object) {
    let curr = object;
    while (curr) {
      const name = (curr.name || "").toLowerCase();
      const matched = INTERACTIVE_OBJECTS.find(obj => name.includes(obj.meshName.toLowerCase()));
      if (matched) return { targetMesh: curr, config: matched };
      curr = curr.parent;
    }
    return null;
  }

  function updateInteractiveList() {
    interactiveMeshes = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        const found = findInteractiveConfig(child);
        if (found) {
          interactiveMeshes.push(child);
          
          // Гарантуємо, що матеріал підтримує emissive (переводимо на MeshStandardMaterial якщо це не Phys/Standard)
          if (child.material && !('emissive' in child.material)) {
            const oldMat = child.material;
            child.material = new THREE.MeshStandardMaterial({
              color: oldMat.color || 0xffffff,
              map: oldMat.map || null,
              roughness: 0.4,
              metalness: 0.1
            });
          }
          if (child.material && child.material.emissive === undefined) {
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      }
    });
  }

  const interval = setInterval(() => {
    if (interactiveMeshes.length === 0) {
      updateInteractiveList();
    } else {
      clearInterval(interval);
    }
  }, 1000);

  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  function checkRaycast() {
    if (interactiveMeshes.length === 0) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveMeshes, false);

    let currentHit = null;

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const found = findInteractiveConfig(hit);
      if (found) {
        currentHit = hit;
      }
    }

    if (hoveredMesh !== currentHit) {
      hoveredMesh = currentHit;

      if (hoveredMesh && !originalScales.has(hoveredMesh)) {
        originalScales.set(hoveredMesh, hoveredMesh.scale.clone());
      }
    }

    if (hoveredMesh) {
      document.body.style.cursor = "pointer";

      // Плавне увімкнення бірюзового емісійного підсвічування
      if (hoveredMesh.material && hoveredMesh.material.emissive) {
        hoveredMesh.material.emissive.copy(turquoiseColor);
        hoveredMesh.material.emissiveIntensity = THREE.MathUtils.lerp(
          hoveredMesh.material.emissiveIntensity, 
          0.6, 
          0.15
        );
      }

      // Плавне збільшення масштабу
      const origScale = originalScales.get(hoveredMesh);
      if (origScale) {
        const targetScale = new THREE.Vector3(origScale.x * 1.04, origScale.y * 1.04, origScale.z * 1.04);
        hoveredMesh.scale.lerp(targetScale, 0.15);
      }
    } else {
      document.body.style.cursor = "default";
    }

    // Плавне згасання для всіх інших об'єктів
    interactiveMeshes.forEach(mesh => {
      if (mesh !== hoveredMesh) {
        if (mesh.material && mesh.material.emissive) {
          mesh.material.emissiveIntensity = THREE.MathUtils.lerp(
            mesh.material.emissiveIntensity, 
            0, 
            0.15
          );
        }

        const origScale = originalScales.get(mesh);
        if (origScale) {
          mesh.scale.lerp(origScale, 0.15);
          if (mesh.scale.distanceTo(origScale) < 0.001) {
            mesh.scale.copy(origScale);
            originalScales.delete(mesh);
          }
        }
      }
    });
  }

  window.addEventListener("click", () => {
    if (interactiveMeshes.length === 0) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const found = findInteractiveConfig(hit);

      if (found && onOpenModal) {
        const box = new THREE.Box3().setFromObject(found.targetMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        onOpenModal(found.config, center, maxDim);
      }
    }
  });

  return {
    update: checkRaycast,
    refresh: updateInteractiveList
  };
}
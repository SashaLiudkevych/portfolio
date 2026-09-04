import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import * as CANNON from "cannon-es";

// Імпорт розділених модулів
import { createCamera, createRenderer, setupResizeHandler } from "./js/camera.js";
import { setupEnvironment } from "./js/lights.js";
import { waterMaterial, glassMaterial, globalClayMaterial, waterBumpTexture, setupClayToggle } from "./js/materials.js";
import { setupPostProcessing } from "./js/effects.js";

// Логіка перемикання вкладок інтерфейсу
window.switchTab = function(tabId) {
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });
};

document.querySelectorAll('.nav-link').forEach(button => {
  button.addEventListener('click', () => {
    switchTab(button.getAttribute('data-tab'));
  });
});

// Інтерфейс завантажувача
const loaderScreen = document.getElementById("loader-screen");
const loaderProgressBar = document.getElementById("loaderProgressBar");
const loaderPercentage = document.getElementById("loaderPercentage");

let glbProgress = 0;
let exrProgress = 0;

function updateOverallProgress() {
  const overall = Math.round(glbProgress * 0.8 + exrProgress * 0.2);
  loaderProgressBar.style.width = overall + "%";
  loaderPercentage.textContent = overall + "%";

  if (overall >= 100) {
    setTimeout(() => {
      loaderScreen.classList.add("hidden");
    }, 400);
  }
}

// Сцена, камера, рендерер
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x232845);

const { camera, baseCameraPosition, cameraTarget } = createCamera();
const renderer = createRenderer();
const composer = setupPostProcessing(renderer, scene, camera);
setupResizeHandler(camera, renderer, composer);

// Фізика Cannon.js
const world = new CANNON.World();
world.gravity.set(0, -15, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

let waterLevelY = 1.0; 
let poolMinX = 0.8, poolMaxX = 3.0;
let poolMinZ = -3.0, poolMaxZ = -0.8;
const perimeterWalls = [];

function setupPoolBoundaries(box) {
  poolMinX = box.min.x;
  poolMaxX = box.max.x;
  poolMinZ = box.min.z;
  poolMaxZ = box.max.z;
  waterLevelY = box.min.y;

  perimeterWalls.forEach(w => world.removeBody(w));
  perimeterWalls.length = 0;

  const margin = 0.25;
  const minX = poolMinX + margin;
  const maxX = poolMaxX - margin;
  const minZ = poolMinZ + margin;
  const maxZ = poolMaxZ - margin;
  const centerY = waterLevelY + 1.0;

  const w1 = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  w1.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
  w1.position.set(minX, centerY, (minZ + maxZ) / 2);
  
  const w2 = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  w2.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
  w2.position.set(maxX, centerY, (minZ + maxZ) / 2);

  const w3 = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  w3.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
  w3.position.set((minX + maxX) / 2, centerY, minZ);

  const w4 = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  w4.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
  w4.position.set((minX + maxX) / 2, centerY, maxZ);

  perimeterWalls.push(w1, w2, w3, w4);
  perimeterWalls.forEach(w => world.addBody(w));
}

let singleBallData = null;
let initialBallRotation = new THREE.Euler();
const allLoadedMeshes = [];
const meshOriginalMaterials = new Map();
const meshClayMaterials = new Map();
const interiorMeshes = [];
const palmMeshes = [];

function initExistingBall(ballMesh) {
  if (singleBallData) return;

  allLoadedMeshes.push(ballMesh);
  if (ballMesh.material) {
    meshOriginalMaterials.set(ballMesh, ballMesh.material);
    meshClayMaterials.set(ballMesh, globalClayMaterial);
  }

  initialBallRotation.copy(ballMesh.rotation);
  ballMesh.geometry.computeBoundingSphere();
  const radius = ballMesh.geometry.boundingSphere ? ballMesh.geometry.boundingSphere.radius : 0.22;

  const ballShape = new CANNON.Sphere(radius);
  const ballBody = new CANNON.Body({
    mass: 0.8,
    shape: ballShape,
    position: new CANNON.Vec3(ballMesh.position.x, ballMesh.position.y, ballMesh.position.z)
  });
  ballBody.linearDamping = 0.2;
  ballBody.angularFactor.set(0, 0, 0);
  world.addBody(ballBody);

  singleBallData = { mesh: ballMesh, body: ballBody, radius: radius };
}

// Управління світлом/окруженням
setupEnvironment(renderer, scene, (progress) => {
  exrProgress = progress;
  updateOverallProgress();
});

// Керування матеріалами та глиною
const clayController = setupClayToggle();

// Слухач миші для паралаксу
const mouse = new THREE.Vector2(-1000, -1000);
const targetCameraOffset = new THREE.Vector2(0, 0);
const currentCameraOffset = new THREE.Vector2(0, 0);
const tempVector = new THREE.Vector3();

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  targetCameraOffset.x = mouse.x * 0.4;
  targetCameraOffset.y = mouse.y * 0.25;
});

// Завантаження GLB моделі
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/");

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.load(
  "./glb_export/Architecture_landing.glb",
  (gltf) => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        const meshName = child.name.toLowerCase();
        const materialName = child.material && child.material.name ? child.material.name.toLowerCase() : "";

        if (meshName === "water_01" || meshName.includes("water_01")) {
          child.visible = false;
          if (child.geometry) {
            child.geometry.computeBoundingBox();
            const box = child.geometry.boundingBox.clone();
            box.applyMatrix4(child.matrixWorld);
            setupPoolBoundaries(box);
          }
          return;
        }

        if (meshName === "ball" || meshName.includes("ball")) {
          initExistingBall(child);
          return;
        }

        if (child.material) {
          allLoadedMeshes.push(child);
          let assignedMaterial;

          if (meshName.includes("water") || meshName.includes("sea") || 
              materialName.includes("water") || materialName.includes("sea")) {
            assignedMaterial = waterMaterial;
            child.geometry.computeBoundingBox();
            const box = child.geometry.boundingBox.clone();
            box.applyMatrix4(child.matrixWorld);
            setupPoolBoundaries(box);
          }
          else if (meshName.includes("glass") || meshName.includes("window") ||  
                   materialName.includes("glass") || materialName.includes("window")) {
            assignedMaterial = glassMaterial;
          } 
          else if (meshName.includes("ceiling_light") || materialName.includes("ceiling_light") || materialName.includes("emission")) {
            const oldMat = child.material;
            assignedMaterial = new THREE.MeshBasicMaterial({
              color: new THREE.Color(0xffffff).multiplyScalar(3.0),
              map: oldMat.map || null
            });
          }
          else if (meshName.includes("palm") || materialName.includes("palm")) {
            const oldMat = child.material;
            if (oldMat.map) oldMat.map.colorSpace = THREE.SRGBColorSpace;
            assignedMaterial = new THREE.MeshBasicMaterial({
              map: oldMat.map || null,
              color: oldMat.color || new THREE.Color(0xffffff),
              side: THREE.DoubleSide,
              transparent: oldMat.transparent || false,
              opacity: oldMat.opacity !== undefined ? oldMat.opacity : 1.0
            });

            const geometry = child.geometry;
            if (geometry && !geometry.userData.originalPosition) {
              geometry.computeBoundingBox();
              geometry.userData.originalPosition = geometry.attributes.position.array.slice();
              geometry.userData.minY = geometry.boundingBox.min.y;
              geometry.userData.maxY = geometry.boundingBox.max.y;
            }
            palmMeshes.push(child);
          }
          else if (meshName.includes("interior") || meshName.includes("room") || meshName.includes("light")) {
            const oldMat = child.material;
            const mat = new THREE.MeshBasicMaterial({ map: oldMat.map || null });
            
            const hue = 1 + Math.random() * 0.2;
            const saturation = 0.3 + Math.random() * 0.5;
            const value = 0.5 + Math.random() * 0.5;
            const randomColor = new THREE.Color().setHSL(hue, saturation, value);
            mat.color = randomColor;

            assignedMaterial = mat;
            interiorMeshes.push({
              mesh: child,
              material: mat,
              baseColor: randomColor.clone(),
              baseFactor: 0.3 + Math.random() * 0.7
            });
          } 
          else {
            const oldMat = child.material;
            assignedMaterial = new THREE.MeshBasicMaterial({
              map: oldMat.map || null,
              color: oldMat.color || new THREE.Color(0xffffff)
            });
          }

          meshOriginalMaterials.set(child, assignedMaterial);
          meshClayMaterials.set(child, globalClayMaterial);
          child.material = assignedMaterial;
        }
      }
    });

    scene.add(gltf.scene);
    glbProgress = 100;
    updateOverallProgress();
  },
  (xhr) => {
    if (xhr.total) {
      glbProgress = Math.floor((xhr.loaded / xhr.total) * 100);
      updateOverallProgress();
    }
  },
  (error) => {
    console.error("Failed to load GLB:", error);
    glbProgress = 100;
    updateOverallProgress();
  }
);

// Головний анімаційний цикл
const clock = new THREE.Clock();
let lastCallTime = performance.now();
const fixedTimeStep = 1 / 60;

function animate() {
  requestAnimationFrame(animate);

  // Паралакс камери
  currentCameraOffset.lerp(targetCameraOffset, 0.05);
  camera.position.x = baseCameraPosition.x + currentCameraOffset.x;
  camera.position.y = baseCameraPosition.y + currentCameraOffset.y;
  camera.position.z = baseCameraPosition.z;
  camera.lookAt(cameraTarget);

  // Плавне перемикання глини (Clay Mode)
  const targetMix = clayController.getIsClayMode() ? 1.0 : 0.0;
  let mixFactor = clayController.getClayMixFactor();
  mixFactor = THREE.MathUtils.lerp(mixFactor, targetMix, 0.06);
  clayController.setClayMixFactor(mixFactor);

  meshOriginalMaterials.forEach((originalMat, mesh) => {
    const clayMat = meshClayMaterials.get(mesh) || globalClayMaterial;
    if (mixFactor > 0.001 && mixFactor < 0.999) {
      mesh.material = mixFactor > 0.5 ? clayMat : originalMat;
    } else if (mixFactor >= 0.999) {
      mesh.material = clayMat;
    } else {
      mesh.material = originalMat;
    }
  });

  const time = performance.now();
  const dt = (time - lastCallTime) / 1000;
  lastCallTime = time;
  const elapsedTime = clock.getElapsedTime();

  // Фізика
  if (dt > 0) {
    world.step(fixedTimeStep, dt, 3);

    if (singleBallData) {
      const { mesh, body, radius } = singleBallData;
      const depthInWater = waterLevelY - body.position.y;
      if (depthInWater > -radius) {
        const buoyancy = Math.max(0, depthInWater + radius) * 45.0;
        body.applyForce(new CANNON.Vec3(0, buoyancy, 0), body.position);

        body.velocity.x *= 0.92;
        body.velocity.z *= 0.92;
        body.velocity.y *= 0.88;

        const waveEffect = Math.sin(elapsedTime * 4.0 + body.position.x * 2.0) * 0.4;
        body.applyForce(new CANNON.Vec3(0, waveEffect, 0), body.position);
      }

      mesh.position.copy(body.position);
      mesh.rotation.copy(initialBallRotation);
    }
  }

  // Анімація води
  if (waterBumpTexture) {
    waterBumpTexture.offset.x += 0.00005;
    waterBumpTexture.offset.y += 0.00005;
  }

  // Анімація пальм (вітру)
  palmMeshes.forEach((mesh) => {
    const geometry = mesh.geometry;
    if (geometry && geometry.userData.originalPosition) {
      const posAttr = geometry.attributes.position;
      const origPos = geometry.userData.originalPosition;
      const minY = geometry.userData.minY;
      const maxY = geometry.userData.maxY;
      const heightRange = maxY - minY > 0 ? maxY - minY : 1;

      for (let i = 0; i < posAttr.count; i++) {
        const ox = origPos[i * 3];
        const oy = origPos[i * 3 + 1];
        const oz = origPos[i * 3 + 2];

        let heightFactor = (oy - minY) / heightRange;
        heightFactor = Math.max(0, Math.min(1, heightFactor));
        heightFactor = Math.max(0, (heightFactor - 0.2) / 0.8);

        const windStrength = 0.015;
        const windX = Math.sin(elapsedTime * 2.5 + ox * 3 + oy) * windStrength * heightFactor;
        const windZ = Math.cos(elapsedTime * 2.0 + oz * 3) * windStrength * 0.7 * heightFactor;

        posAttr.setX(i, ox + windX);
        posAttr.setZ(i, oz + windZ);
      }
      posAttr.needsUpdate = true;
    }
  });

  // Підсвічування інтер'єру курсором
  if (mixFactor < 0.99) {
    interiorMeshes.forEach((item) => {
      item.mesh.getWorldPosition(tempVector);
      tempVector.project(camera);

      let intensityMultiplier = item.baseFactor;
      if (tempVector.z < 1) {
        const dx = tempVector.x - mouse.x;
        const dy = tempVector.y - mouse.y;
        const screenDist = Math.sqrt(dx * dx + dy * dy);
        const cursorRadius = 0.25;

        if (screenDist < cursorRadius) {
          const factor = 1 - (screenDist / cursorRadius);
          intensityMultiplier += factor * 3.0;
        }
      }

      const targetColor = item.baseColor.clone().multiplyScalar(intensityMultiplier);
      item.material.color.lerp(targetColor, 0.1);
    });
  }

  composer.render();
}

animate();
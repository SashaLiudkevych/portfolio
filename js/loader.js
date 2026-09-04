import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { waterMaterial, glassMaterial, globalClayMaterial } from "./materials.js";

export function loadArchitectureModel(scene, world, onGlbProgress, onComplete) {
  const allLoadedMeshes = [];
  const meshOriginalMaterials = new Map();
  const meshClayMaterials = new Map();
  const palmMeshes = [];
  
  let singleBallData = null;
  let initialBallRotation = new THREE.Euler();
  let waterLevelY = 1.0;

  // Басейн / межі фізики
  const perimeterWalls = [];
  function setupPoolBoundaries(box) {
    waterLevelY = box.min.y;
    perimeterWalls.forEach(w => world.removeBody(w));
    perimeterWalls.length = 0;

    const margin = 0.25;
    const minX = box.min.x + margin;
    const maxX = box.max.x - margin;
    const minZ = box.min.z + margin;
    const maxZ = box.max.z - margin;
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

  // Фізичний м'яч
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
      if (onGlbProgress) onGlbProgress(100);
      if (onComplete) onComplete({ singleBallData, palmMeshes, meshOriginalMaterials, meshClayMaterials, waterLevelY });
    },
    (xhr) => {
      if (xhr.total && onGlbProgress) {
        const progress = Math.floor((xhr.loaded / xhr.total) * 100);
        onGlbProgress(progress);
      }
    },
    (error) => {
      console.error("Failed to load GLB:", error);
      if (onGlbProgress) onGlbProgress(100);
    }
  );
}
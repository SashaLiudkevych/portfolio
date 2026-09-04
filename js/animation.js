import * as THREE from "three";

export function setupAnimationLoop({
  world,
  camera,
  baseCameraPosition,
  cameraTarget,
  targetCameraOffset,
  currentCameraOffset,
  clayController,
  meshOriginalMaterials,
  meshClayMaterials,
  globalClayMaterial,
  singleBallData,
  waterLevelY,
  waterBumpTexture,
  palmMeshes,
  composer
}) {
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

    // Фізика м'яча та води
    if (dt > 0) {
      world.step(fixedTimeStep, dt, 3);

      if (singleBallData && singleBallData.mesh && singleBallData.body) {
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
        mesh.rotation.copy(mesh.userData.initialRotation || new THREE.Euler());
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

    composer.render();
  }

  animate();
}
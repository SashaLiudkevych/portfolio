import * as THREE from "three";

// Генерація шуму для води
function createWaterNoiseTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    data[i]     = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.05, 0.05);
  return texture;
}

export const waterBumpTexture = createWaterNoiseTexture();

export const waterMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x2AD4B4,
  metalness: 0.1,
  roughness: 0.1,
  transmission: 0.8,
  thickness: 1.0,
  ior: 1,
  envMapIntensity: 2,
  bumpMap: waterBumpTexture,
  bumpScale: 0.7,
  transparent: true,
  opacity: 0.85,
  depthWrite: false
});

export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xABABAB,
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.99,
  thickness: 1.5,
  ior: 1,
  envMapIntensity: 2,
  transparent: true,
  opacity: 0.8,
  depthWrite: false
});

export const globalClayMaterial = new THREE.MeshStandardMaterial({
  color: 0x6e6e6e,
  roughness: 0.85,
  metalness: 0.05,
  side: THREE.DoubleSide
});

// Налаштування перемикача режиму глини
export function setupClayToggle() {
  let isClayMode = false;
  let clayMixFactor = 0.0;
  
  const clayToggleBtn = document.getElementById("clayToggleBtn");
  clayToggleBtn.addEventListener("click", () => {
    isClayMode = !isClayMode;
    clayToggleBtn.classList.toggle("active", isClayMode);
  });

  return {
    getIsClayMode: () => isClayMode,
    getClayMixFactor: () => clayMixFactor,
    setClayMixFactor: (val) => { clayMixFactor = val; }
  };
}
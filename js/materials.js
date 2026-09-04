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

// Процедурна текстура вертикального градієнта для імітації глибини
function createWaterGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Зверху світліше/прозоріше, знизу глибокий темний відтінок
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)'); // Верх
  gradient.addColorStop(0.5, 'rgba(120, 220, 200, 0.9)'); // Середина
  gradient.addColorStop(1.0, 'rgba(15, 85, 95, 0.8)');    // Дно (темніше)

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export const waterBumpTexture = createWaterNoiseTexture();
const waterGradientTexture = createWaterGradientTexture();

export const waterMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x2AD4B4,
  metalness: 0.1,
  roughness: 0.1,
  transmission: 0.8,
  thickness: 1.5,
  ior: 1.1,
  envMapIntensity: 2,
  bumpMap: waterBumpTexture,
  bumpScale: 0.7,
  // Використовуємо alphaMap для красивого переходу щільності від верху до дна
  alphaMap: waterGradientTexture,
  transparent: true,
  opacity: 0.8,
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
  color: 0x4D4D4D,
  roughness: 0.9,
  metalness: 0.1,
  envMapIntensity: 0.01 // Значно зменшує відбиття середовища в режимі глини
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
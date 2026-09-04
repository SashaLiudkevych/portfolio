import * as THREE from "three";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js";

export function setupPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.2,  
    0.5,  
    0.75  
  );
  composer.addPass(bloomPass);

  // SMAA антиаліасинг поверх рендеру та блуму прибирає будь-який шум і «драбинку»
  const dpr = renderer.getPixelRatio();
  const smaaPass = new SMAAPass(window.innerWidth * dpr, window.innerHeight * dpr);
  composer.addPass(smaaPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return composer;
}
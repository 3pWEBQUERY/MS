"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene, type SceneApi, type SceneColors } from "./use-three";

/**
 * «Faserfeld» – Markensignatur (docs/DESIGN.md): feine Bahnen, links gebündelt, nach rechts
 * aufgefächert, die ruhig atmen. Auf einigen Bahnen laufen kleine Impulse in Glut – ein Bild für
 * Signale, die weitergeleitet werden. Orthografisch und flach: nur Linien und Punkte in
 * Volltonfarben, keine Verläufe, keine Beleuchtung, keine Schatten. Rein dekorativ.
 */
const HALF = 12; // halbe Feldbreite in Szeneneinheiten

/* Gemeinsame Bahnfunktion für Linien und Impulse (GLSL) */
const FIBER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uHeight;

  float fiberY(float x, float lane, float seed) {
    float u = (x + ${HALF.toFixed(1)}) / ${(HALF * 2).toFixed(1)};      // 0 … 1 von links nach rechts
    float spread = mix(0.12, 1.0, smoothstep(0.0, 0.85, u));             // Bündel → Fächer
    float t = uTime;
    float y = lane * uHeight * spread;
    y += sin(x * 0.32 + t * 0.35 + seed * 6.2831) * 0.32 * spread;
    y += sin(x * 0.11 - t * 0.21 + seed * 3.1) * 0.55 * spread;
    // sanfte Auslenkung unter dem Zeiger
    float dx = x - uPointer.x * ${HALF.toFixed(1)};
    y += uPointer.y * uHeight * 0.18 * exp(-dx * dx * 0.04) * spread;
    return y;
  }
`;

const lineVertex = /* glsl */ `
  ${FIBER}
  attribute float aLane;
  attribute float aSeed;
  attribute float aStrong;
  varying float vStrong;
  void main() {
    vStrong = aStrong;
    vec3 p = vec3(position.x, fiberY(position.x, aLane, aSeed), 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const lineFragment = /* glsl */ `
  uniform vec3 uLine;
  uniform vec3 uInk;
  varying float vStrong;
  void main() {
    gl_FragColor = vStrong > 0.5 ? vec4(uInk, 0.85) : vec4(uLine, 0.55);
  }
`;

const pulseVertex = /* glsl */ `
  ${FIBER}
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aLane;
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aOffset;
  void main() {
    float x = -${HALF.toFixed(1)} + mod(uTime * aSpeed + aOffset, ${(HALF * 2).toFixed(1)});
    vec3 p = vec3(x, fiberY(x, aLane, aSeed), 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio;
  }
`;

const pulseFragment = /* glsl */ `
  uniform vec3 uAccent;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    gl_FragColor = vec4(uAccent, 1.0);
  }
`;

const FIBERS = 46;
const SEGMENTS = 180;

function rand(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function createScene({ renderer, width, height }: SceneApi, colors: SceneColors) {
  const scene = new THREE.Scene();
  const aspect = () => Math.max(width, 1) / Math.max(height, 1);
  const camera = new THREE.OrthographicCamera(-HALF, HALF, HALF / aspect(), -HALF / aspect(), -10, 10);

  const shared = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uHeight: { value: (HALF / aspect()) * 0.82 },
  };

  const lineMaterial = new THREE.ShaderMaterial({
    vertexShader: lineVertex,
    fragmentShader: lineFragment,
    uniforms: { ...shared, uLine: { value: colors.muted.clone() }, uInk: { value: colors.ink.clone() } },
    transparent: true,
    depthWrite: false,
  });

  const geometries: THREE.BufferGeometry[] = [];
  for (let f = 0; f < FIBERS; f++) {
    const lane = (f / (FIBERS - 1)) * 2 - 1; // −1 … 1
    const seed = rand(f + 1);
    const strong = f % 9 === 4 ? 1 : 0;
    const pos = new Float32Array((SEGMENTS + 1) * 3);
    const laneA = new Float32Array(SEGMENTS + 1).fill(lane);
    const seedA = new Float32Array(SEGMENTS + 1).fill(seed);
    const strongA = new Float32Array(SEGMENTS + 1).fill(strong);
    for (let i = 0; i <= SEGMENTS; i++) pos[i * 3] = -HALF + (i / SEGMENTS) * HALF * 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aLane", new THREE.BufferAttribute(laneA, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seedA, 1));
    g.setAttribute("aStrong", new THREE.BufferAttribute(strongA, 1));
    geometries.push(g);
    scene.add(new THREE.Line(g, lineMaterial));
  }

  // Impulse: wenige Punkte auf ausgewählten Bahnen, unterschiedlich schnell
  const PULSES = 9;
  const pPos = new Float32Array(PULSES * 3);
  const pLane = new Float32Array(PULSES);
  const pSeed = new Float32Array(PULSES);
  const pSpeed = new Float32Array(PULSES);
  const pOffset = new Float32Array(PULSES);
  for (let i = 0; i < PULSES; i++) {
    const f = Math.floor(rand(i + 40) * FIBERS);
    pLane[i] = (f / (FIBERS - 1)) * 2 - 1;
    pSeed[i] = rand(f + 1);
    pSpeed[i] = 0.9 + rand(i + 90) * 1.4;
    pOffset[i] = rand(i + 120) * HALF * 2;
  }
  const pulseGeometry = new THREE.BufferGeometry();
  pulseGeometry.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pulseGeometry.setAttribute("aLane", new THREE.BufferAttribute(pLane, 1));
  pulseGeometry.setAttribute("aSeed", new THREE.BufferAttribute(pSeed, 1));
  pulseGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(pSpeed, 1));
  pulseGeometry.setAttribute("aOffset", new THREE.BufferAttribute(pOffset, 1));
  const pulseMaterial = new THREE.ShaderMaterial({
    vertexShader: pulseVertex,
    fragmentShader: pulseFragment,
    uniforms: {
      ...shared,
      uSize: { value: 7 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uAccent: { value: colors.accent.clone() },
    },
  });
  const pulses = new THREE.Points(pulseGeometry, pulseMaterial);
  pulses.frustumCulled = false;
  scene.add(pulses);

  const target = new THREE.Vector2(0, 0);

  return {
    frame(t: number) {
      shared.uTime.value = t;
      shared.uPointer.value.lerp(target, 0.035);
      renderer.render(scene, camera);
    },
    resize(w: number, h: number) {
      width = w;
      height = h;
      camera.top = HALF / aspect();
      camera.bottom = -HALF / aspect();
      camera.updateProjectionMatrix();
      shared.uHeight.value = (HALF / aspect()) * 0.82;
    },
    setColors(c: SceneColors) {
      lineMaterial.uniforms.uLine.value.copy(c.muted);
      lineMaterial.uniforms.uInk.value.copy(c.ink);
      pulseMaterial.uniforms.uAccent.value.copy(c.accent);
    },
    pointer(x: number, y: number) {
      // nur innerhalb des Feldes reagieren, ruhig gedämpft
      target.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)) * 0.6);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      pulseGeometry.dispose();
      lineMaterial.dispose();
      pulseMaterial.dispose();
    },
  };
}

/** Auf der tiefen Fläche (bg-deep) helle Bahnen und Glut-Impulse aus den deep-Tokens. */
function deepColors(c: SceneColors): SceneColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => new THREE.Color((s.getPropertyValue(name).trim() || fallback) as THREE.ColorRepresentation);
  return { ...c, ink: v("--on-deep", "#f3f0e9"), muted: v("--on-deep-2", "#b9b4a8"), accent: v("--deep-accent", "#f0a27a") };
}

function createDeepScene(api: SceneApi, colors: SceneColors) {
  const ctrl = createScene(api, deepColors(colors));
  return { ...ctrl, setColors: (c: SceneColors) => ctrl.setColors(deepColors(c)) };
}

export function FiberField({ className, tone = "paper" }: { className?: string; tone?: "paper" | "deep" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useThreeScene(ref, tone === "deep" ? createDeepScene : createScene);
  return <canvas ref={ref} aria-hidden="true" role="presentation" className={className} />;
}

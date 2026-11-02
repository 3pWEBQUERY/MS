"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene, type SceneApi, type SceneColors } from "./use-three";

/**
 * «Feld der Momente»: ein ruhig atmendes Punktefeld. Langsame Wellen laufen
 * über die Fläche; wo eine Welle einen Punkt erreicht, wechselt er kurz in die
 * Akzentfarbe – harte Farbstufen statt Verläufe, keine Beleuchtung, keine Schatten.
 */
const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform vec2 uPointer;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAccent;
  varying float vSeed;

  void main() {
    vec3 p = position;
    float t = uTime * 0.22;
    float w = sin(p.x * 0.32 + t * 1.3) * 0.55
            + sin(p.z * 0.45 - t * 0.9) * 0.4
            + sin((p.x + p.z) * 0.18 + t * 0.6) * 0.6;
    // sanfte Delle unter dem Zeiger
    float d = distance(p.xz, uPointer * vec2(14.0, 6.0));
    w -= 0.6 * exp(-d * d * 0.02);
    p.y += w;

    // Wellenringe, die von wechselnden Zentren ausgehen
    float ring = 0.0;
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      float cycle = 11.0;
      float phase = mod(uTime + fi * cycle * 0.5, cycle) / cycle;
      vec2 center = vec2(sin(fi * 2.3 + floor((uTime + fi * cycle * 0.5) / cycle) * 1.7) * 9.0, cos(fi * 1.1) * 3.0);
      float radius = phase * 26.0;
      float dist = distance(p.xz, center);
      float band = 1.0 - step(0.9, abs(dist - radius));
      ring = max(ring, band * step(0.55, aSeed) * (1.0 - phase));
    }
    vAccent = ring;
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (1.0 + vAccent * 0.7) * (18.0 / -mv.z);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform vec3 uMuted;
  varying float vAccent;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    vec3 col = vSeed > 0.92 ? uBase : uMuted;
    col = vAccent > 0.05 ? uAccent : col;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function createScene({ renderer, width, height }: SceneApi, colors: SceneColors) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 200);
  camera.position.set(0, 7.5, 17);
  camera.lookAt(0, -2.5, -2);

  const cols = 110;
  const rows = 56;
  const spacing = 0.52;
  const positions = new Float32Array(cols * rows * 3);
  const seeds = new Float32Array(cols * rows);
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      positions[i * 3] = (c - cols / 2) * spacing;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = (r - rows / 2) * spacing;
      // deterministischer Pseudo-Zufall
      k = (k * 1103515245 + 12345 + i) % 2147483648;
      seeds[i] = (k % 1000) / 1000;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uSize: { value: width < 640 ? 6.5 : 5.5 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uBase: { value: colors.ink.clone() },
    uMuted: { value: colors.muted.clone() },
    uAccent: { value: colors.accent.clone() },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: false });
  const points = new THREE.Points(geometry, material);
  points.rotation.y = -0.18;
  scene.add(points);

  const target = new THREE.Vector2(0, 0);

  return {
    frame(t: number) {
      uniforms.uTime.value = t;
      uniforms.uPointer.value.lerp(target, 0.04);
      points.rotation.y = -0.18 + Math.sin(t * 0.05) * 0.06;
      renderer.render(scene, camera);
    },
    resize(w: number, h: number) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uSize.value = w < 640 ? 6.5 : 5.5;
    },
    setColors(c: SceneColors) {
      uniforms.uBase.value.copy(c.ink);
      uniforms.uMuted.value.copy(c.muted);
      uniforms.uAccent.value.copy(c.accent);
    },
    pointer(x: number, y: number) {
      target.set(x, -y);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function MomentField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useThreeScene(ref, createScene);
  return <canvas ref={ref} aria-hidden="true" role="presentation" className={className} />;
}

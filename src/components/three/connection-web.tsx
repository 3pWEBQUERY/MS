"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene, type SceneApi, type SceneColors } from "./use-three";

/**
 * «Verbindungen»: langsam treibende Knoten, die sich bei Nähe mit feinen Linien
 * verbinden – Sinnbild für Austausch mit gegenseitiger Zustimmung. Flache Farben.
 */
function createScene({ renderer, width, height }: SceneApi, colors: SceneColors) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 0, 18);

  const count = 64;
  const nodes = Array.from({ length: count }, (_, i) => {
    const a = i * 2.399963; // goldener Winkel
    const r = 3.2 + ((i * 37) % 23) / 4;
    return {
      base: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.62, ((i * 13) % 11) - 5),
      phase: (i * 0.77) % (Math.PI * 2),
      speed: 0.12 + ((i * 7) % 10) / 80,
      accent: i % 9 === 0,
    };
  });

  // Kreisförmige Punkte mit harter Kante (alphaTest) – kein weicher Verlauf
  const dot = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(32, 32, 30, 0, Math.PI * 2);
    g.fill();
    return new THREE.CanvasTexture(c);
  })();

  const pointPositions = new Float32Array(count * 3);
  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
  const pointMat = new THREE.PointsMaterial({ color: colors.ink, size: 0.2, sizeAttenuation: true, map: dot, alphaTest: 0.5, transparent: false });
  const points = new THREE.Points(pointGeo, pointMat);

  const accentIdx = nodes.flatMap((n, i) => (n.accent ? [i] : []));
  const accentPositions = new Float32Array(accentIdx.length * 3);
  const accentGeo = new THREE.BufferGeometry();
  accentGeo.setAttribute("position", new THREE.BufferAttribute(accentPositions, 3));
  const accentMat = new THREE.PointsMaterial({ color: colors.accent, size: 0.42, sizeAttenuation: true, map: dot, alphaTest: 0.5, transparent: false });
  const accentPoints = new THREE.Points(accentGeo, accentMat);

  const maxLines = 260;
  const linePositions = new Float32Array(maxLines * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: colors.line });
  const lines = new THREE.LineSegments(lineGeo, lineMat);

  const group = new THREE.Group();
  group.add(lines, points, accentPoints);
  scene.add(group);

  const current = nodes.map(() => new THREE.Vector3());
  const tilt = new THREE.Vector2();
  const tiltTarget = new THREE.Vector2();

  return {
    frame(t: number) {
      nodes.forEach((n, i) => {
        current[i].set(
          n.base.x + Math.sin(t * n.speed + n.phase) * 0.9,
          n.base.y + Math.cos(t * n.speed * 0.8 + n.phase) * 0.7,
          n.base.z + Math.sin(t * n.speed * 0.6 + n.phase * 2) * 0.8,
        );
        pointPositions.set([current[i].x, current[i].y, current[i].z], i * 3);
      });
      accentIdx.forEach((idx, j) => accentPositions.set([current[idx].x, current[idx].y, current[idx].z], j * 3));

      let l = 0;
      for (let a = 0; a < count && l < maxLines; a++) {
        for (let b = a + 1; b < count && l < maxLines; b++) {
          if (current[a].distanceToSquared(current[b]) < 6.2) {
            linePositions.set([current[a].x, current[a].y, current[a].z, current[b].x, current[b].y, current[b].z], l * 6);
            l++;
          }
        }
      }
      lineGeo.setDrawRange(0, l * 2);
      pointGeo.attributes.position.needsUpdate = true;
      accentGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.position.needsUpdate = true;

      tilt.lerp(tiltTarget, 0.03);
      group.rotation.y = t * 0.03 + tilt.x * 0.25;
      group.rotation.x = tilt.y * 0.15;
      renderer.render(scene, camera);
    },
    resize(w: number, h: number) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    setColors(c: SceneColors) {
      pointMat.color.copy(c.ink);
      accentMat.color.copy(c.accent);
      lineMat.color.copy(c.line);
    },
    pointer(x: number, y: number) {
      tiltTarget.set(x, y);
    },
    dispose() {
      [pointGeo, accentGeo, lineGeo].forEach((g) => g.dispose());
      [pointMat, accentMat, lineMat].forEach((m) => m.dispose());
      dot.dispose();
    },
  };
}

export function ConnectionWeb({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useThreeScene(ref, createScene);
  return <canvas ref={ref} aria-hidden="true" role="presentation" className={className} />;
}

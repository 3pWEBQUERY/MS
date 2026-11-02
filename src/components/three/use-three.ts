"use client";

import { useEffect, type RefObject } from "react";
import * as THREE from "three";

export type SceneColors = { ink: THREE.Color; muted: THREE.Color; accent: THREE.Color; line: THREE.Color; bg: THREE.Color };

export type SceneApi = {
  renderer: THREE.WebGLRenderer;
  width: number;
  height: number;
};

export type SceneController = {
  /** Wird pro Bild aufgerufen; t in Sekunden */
  frame: (t: number, dt: number) => void;
  resize?: (width: number, height: number) => void;
  setColors?: (c: SceneColors) => void;
  pointer?: (x: number, y: number) => void;
  dispose: () => void;
};

function readColors(): SceneColors {
  const s = getComputedStyle(document.documentElement);
  const c = (v: string, f: string) => new THREE.Color((s.getPropertyValue(v).trim() || f) as THREE.ColorRepresentation);
  return {
    ink: c("--ink", "#16181c"),
    muted: c("--ink-3", "#62666e"),
    accent: c("--accent", "#b8400f"),
    line: c("--line-2", "#cfccc2"),
    bg: c("--bg", "#f5f4f0"),
  };
}

/** Bewegung nur, wenn weder System noch Mitgliederpräferenz noch einfache Ansicht sie reduzieren (HOM06). */
function motionAllowed(): boolean {
  const html = document.documentElement;
  if (html.dataset.simple === "true" || html.dataset.motion === "reduce") return false;
  if (html.dataset.motion === "allow") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Gemeinsamer Lebenszyklus für dekorative Three.js-Szenen:
 * pausiert ausserhalb des Sichtbereichs und bei verstecktem Tab, respektiert reduzierte
 * Bewegung (statisches Einzelbild), begrenzt die Pixeldichte und reagiert auf Theme-Wechsel.
 */
export function useThreeScene(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  setup: (api: SceneApi, colors: SceneColors) => SceneController,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // Ohne WebGL bleibt die Fläche leer – rein dekorativ.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const rect = () => canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
    let { width, height } = rect();
    renderer.setSize(width, height, false);

    const controller = setup({ renderer, width, height }, readColors());

    let raf = 0;
    let visible = true;
    let running = false;
    const clock = new THREE.Clock();
    let elapsed = 0;

    const renderOnce = () => controller.frame(elapsed, 0);

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;
      controller.frame(elapsed, dt);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || !visible || document.hidden || !motionAllowed()) return;
      running = true;
      clock.getDelta();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => {
      if (visible && !document.hidden && motionAllowed()) start();
      else {
        stop();
        renderOnce();
      }
    };

    // Statischer Ausgangszustand mit etwas Zeitversatz, damit das Feld nicht flach wirkt.
    elapsed = 8;
    renderOnce();
    sync();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      ({ width, height } = rect());
      renderer.setSize(width, height, false);
      controller.resize?.(width, height);
      if (!running) renderOnce();
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const mo = new MutationObserver(() => {
      controller.setColors?.(readColors());
      sync();
      if (!running) renderOnce();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-motion", "data-simple"] });

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => {
      controller.setColors?.(readColors());
      sync();
    };
    mq.addEventListener("change", onMq);
    dark.addEventListener("change", onMq);
    document.addEventListener("visibilitychange", sync);

    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      controller.pointer?.(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", onMq);
      dark.removeEventListener("change", onMq);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointer);
      controller.dispose();
      renderer.dispose();
    };
  }, [canvasRef, setup]);
}

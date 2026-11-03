"use client";

import dynamic from "next/dynamic";

/** Three.js wird erst im Browser und nach dem ersten Rendern geladen (NFR03, LCP). */
export const MomentField = dynamic(() => import("./moment-field").then((m) => m.MomentField), { ssr: false });
export const ConnectionWeb = dynamic(() => import("./connection-web").then((m) => m.ConnectionWeb), { ssr: false });
export const FiberField = dynamic(() => import("./fiber-field").then((m) => m.FiberField), { ssr: false });

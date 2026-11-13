import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

/** Warm off-white paper with soft mottling and a faint vignette. */
export const PaperBackground: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.paper }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <filter id="mottle" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves={3} seed={7} />
        <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.25  0 0 0 0.5 -0.12" />
      </filter>
      <rect width="100%" height="100%" filter="url(#mottle)" opacity={0.35} />
    </svg>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%, rgba(120,100,70,0.16) 100%)",
      }}
    />
  </AbsoluteFill>
);

/** Fine static grain laid over everything. */
export const Grain: React.FC = () => (
  <AbsoluteFill style={{ mixBlendMode: "multiply", pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.55 -0.14" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" opacity={0.5} />
    </svg>
  </AbsoluteFill>
);

/** Shared SVG defs: cut-paper drop shadow + glow. */
export const ArtDefs: React.FC = () => (
  <defs>
    <filter id="cut" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="3" dy="5" stdDeviation="3" floodColor="#3a2f1c" floodOpacity="0.28" />
    </filter>
    <filter id="cutSoft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#3a2f1c" floodOpacity="0.2" />
    </filter>
    <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
    <pattern id="hatchRed" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="12" height="12" fill="#D9483B" opacity="0.16" />
      <rect width="4" height="12" fill="#D9483B" opacity="0.5" />
    </pattern>
  </defs>
);

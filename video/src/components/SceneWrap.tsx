import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";

/** Fade in/out plus the slow camera push on the paper. */
export const SceneWrap: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const opacity = Math.min(
    interpolate(frame, [0, 8], [0, 1], cl),
    interpolate(frame, [duration - 7, duration - 1], [1, 0], cl),
  );
  const push = interpolate(frame, [0, duration], [1, 1.035], cl);
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${push})`, transformOrigin: "50% 40%" }}>{children}</AbsoluteFill>
  );
};

/** Ambient music bed with fade in/out over the whole video. */
export const MusicBed: React.FC<{ volume: number; totalFrames: number }> = ({ volume, totalFrames }) => (
  <Audio
    src={staticFile("ambient.mp3")}
    volume={(fr) =>
      volume *
      interpolate(fr, [0, 45, totalFrames - 75, totalFrames - 1], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    }
  />
);

import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "./components/Captions";
import { Grain, PaperBackground } from "./components/Paper";
import { Disclosure } from "./scenes/Disclosure";
import { EndCard } from "./scenes/EndCard";
import { Hook } from "./scenes/Hook";
import { Intersection } from "./scenes/Intersection";
import { IsoSpread } from "./scenes/IsoSpread";
import { Principle } from "./scenes/Principle";
import { SlowRefund } from "./scenes/SlowRefund";
import { Trap } from "./scenes/Trap";
import { TwoRoads } from "./scenes/TwoRoads";
import { f, LINES, SCENES, SCENE_TIMING, TOTAL_FRAMES, type SceneId } from "./timeline";

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  hook: Hook,
  iso: IsoSpread,
  roads: TwoRoads,
  trap: Trap,
  refund: SlowRefund,
  intersection: Intersection,
  principle: Principle,
  endcard: EndCard,
  disclosure: Disclosure,
};

/** Fade in/out plus the slow camera push on the paper. */
const SceneWrap: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
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

export type VideoProps = {
  /** Synthetic narration (public/vo). On by default; --props='{"voiceover":false}' for a silent cut. */
  voiceover: boolean;
  /** Soft ambient music bed. Off by default; turn on with --props='{"music":true}'. */
  music: boolean;
  musicVolume: number;
};

export const IsoAmtVideo: React.FC<VideoProps> = ({ voiceover, music, musicVolume }) => (
  <AbsoluteFill>
    <PaperBackground />
    {SCENES.map(({ id }) => {
      const Scene = SCENE_COMPONENTS[id];
      const { from, duration } = SCENE_TIMING[id];
      return (
        <Sequence key={id} name={id} from={from} durationInFrames={duration}>
          <SceneWrap duration={duration}>
            <Scene />
          </SceneWrap>
          <Captions scene={id} />
          {voiceover
            ? LINES[id].map((l) => (
                <Sequence key={l.id} from={f(l.at)} layout="none">
                  <Audio src={staticFile(`vo/${l.id}.mp3`)} />
                </Sequence>
              ))
            : null}
        </Sequence>
      );
    })}
    <Grain />
    {music ? (
      <Audio
        src={staticFile("ambient.mp3")}
        volume={(fr) =>
          musicVolume *
          interpolate(fr, [0, 45, TOTAL_FRAMES - 75, TOTAL_FRAMES - 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    ) : null}
  </AbsoluteFill>
);

import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Captions } from "../components/Captions";
import { Grain, PaperBackground } from "../components/Paper";
import { MusicBed, SceneWrap } from "../components/SceneWrap";
import { Disclosure } from "../scenes/Disclosure";
import { EndCard } from "../scenes/EndCard";
import { Catch } from "./scenes/Catch";
import { Clock } from "./scenes/Clock";
import { Differ } from "./scenes/Differ";
import { Dollars } from "./scenes/Dollars";
import { Early } from "./scenes/Early";
import { Hook } from "./scenes/Hook";
import { How } from "./scenes/How";
import { Principle } from "./scenes/Principle";
import { Pieces } from "./scenes/Pieces";
import { Wait } from "./scenes/Wait";
import { DISCLOSURE_FIRM_LINE, DISCLOSURE_TEXT } from "./script";
import { LINES, SCENES, SCENE_TIMING, TOTAL_FRAMES, type SceneId } from "./timeline";

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  hook: Hook,
  how: How,
  clock: Clock,
  pieces: Pieces,
  early: Early,
  wait: Wait,
  differ: Differ,
  dollars: Dollars,
  catch: Catch,
  principle: Principle,
  endcard: EndCard,
  disclosure: () => <Disclosure text={DISCLOSURE_TEXT} firmLine={DISCLOSURE_FIRM_LINE} />,
};

export type EsppProps = {
  /** Soft ambient music bed. On by default; --props='{"music":false}' for a silent cut. */
  music: boolean;
  musicVolume: number;
};

export const EsppVideo: React.FC<EsppProps> = ({ music, musicVolume }) => (
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
          <Captions lines={LINES[id]} />
        </Sequence>
      );
    })}
    <Grain />
    {music ? <MusicBed volume={musicVolume} totalFrames={TOTAL_FRAMES} /> : null}
  </AbsoluteFill>
);

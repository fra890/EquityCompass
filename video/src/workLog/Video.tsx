import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Captions } from "../components/Captions";
import { Grain, PaperBackground } from "../components/Paper";
import { MusicBed, SceneWrap } from "../components/SceneWrap";
import { Disclosure } from "../scenes/Disclosure";
import { EndCard } from "../scenes/EndCard";
import { Allocation } from "./scenes/Allocation";
import { Closing } from "./scenes/Closing";
import { Consolidation } from "./scenes/Consolidation";
import { Family } from "./scenes/Family";
import { Hook } from "./scenes/Hook";
import { Stock } from "./scenes/Stock";
import { Taxes } from "./scenes/Taxes";
import { DISCLOSURE_FIRM_LINE, DISCLOSURE_TEXT } from "./script";
import { LINES, SCENES, SCENE_TIMING, TOTAL_FRAMES, type SceneId } from "./timeline";

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  hook: Hook,
  consolidation: Consolidation,
  allocation: Allocation,
  stock: Stock,
  taxes: Taxes,
  family: Family,
  closing: Closing,
  endcard: EndCard,
  disclosure: () => <Disclosure text={DISCLOSURE_TEXT} firmLine={DISCLOSURE_FIRM_LINE} />,
};

export type WorkLogProps = {
  /** Soft ambient music bed. On by default; --props='{"music":false}' for a silent cut. */
  music: boolean;
  musicVolume: number;
};

export const WorkLogVideo: React.FC<WorkLogProps> = ({ music, musicVolume }) => (
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

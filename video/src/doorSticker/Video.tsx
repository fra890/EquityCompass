import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Captions } from "../components/Captions";
import { Grain, PaperBackground } from "../components/Paper";
import { MusicBed, SceneWrap } from "../components/SceneWrap";
import { Disclosure } from "../scenes/Disclosure";
import { EndCard } from "../scenes/EndCard";
import { Coworkers } from "./scenes/Coworkers";
import { Cost } from "./scenes/Cost";
import { Hook } from "./scenes/Hook";
import { PlanBackstop } from "./scenes/PlanBackstop";
import { PlanDebt } from "./scenes/PlanDebt";
import { PlanLots } from "./scenes/PlanLots";
import { PlanTender } from "./scenes/PlanTender";
import { PlanWithholding } from "./scenes/PlanWithholding";
import { Principle } from "./scenes/Principle";
import { Squeeze } from "./scenes/Squeeze";
import { Truck } from "./scenes/Truck";
import { Wants } from "./scenes/Wants";
import { DISCLOSURE_FIRM_LINE, DISCLOSURE_TEXT } from "./script";
import { LINES, SCENES, SCENE_TIMING, TOTAL_FRAMES, type SceneId } from "./timeline";

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  hook: Hook,
  squeeze: Squeeze,
  wants: Wants,
  coworkers: Coworkers,
  planTender: PlanTender,
  planLots: PlanLots,
  planWithholding: PlanWithholding,
  planDebt: PlanDebt,
  planBackstop: PlanBackstop,
  truck: Truck,
  cost: Cost,
  principle: Principle,
  endcard: EndCard,
  disclosure: () => <Disclosure text={DISCLOSURE_TEXT} firmLine={DISCLOSURE_FIRM_LINE} />,
};

export type DoorStickerProps = {
  /** Soft ambient music bed. Off by default; turn on with --props='{"music":true}'. */
  music: boolean;
  musicVolume: number;
};

export const DoorStickerVideo: React.FC<DoorStickerProps> = ({ music, musicVolume }) => (
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

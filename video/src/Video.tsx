import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Captions } from "./components/Captions";
import { Grain, PaperBackground } from "./components/Paper";
import { MusicBed, SceneWrap } from "./components/SceneWrap";
import { CAPTIONS_HIDDEN, DISCLOSURE_FIRM_LINE, DISCLOSURE_TEXT } from "./script";
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
  disclosure: () => <Disclosure text={DISCLOSURE_TEXT} firmLine={DISCLOSURE_FIRM_LINE} />,
};

export type VideoProps = {
  /** Narration clips (public/vo). Off by default; --props='{"voiceover":true}' to include them. */
  voiceover: boolean;
  /** Soft ambient music bed. On by default; --props='{"music":false}' for a silent cut. */
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
          <Captions lines={LINES[id]} hidden={CAPTIONS_HIDDEN[id]} />
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
    {music ? <MusicBed volume={musicVolume} totalFrames={TOTAL_FRAMES} /> : null}
  </AbsoluteFill>
);

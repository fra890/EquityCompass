import React from "react";
import { Composition } from "remotion";
import "./fonts";
import { TOTAL_FRAMES as DOOR_FRAMES } from "./doorSticker/timeline";
import { DoorStickerVideo, type DoorStickerProps } from "./doorSticker/Video";
import { TOTAL_FRAMES as ESPP_FRAMES } from "./espp/timeline";
import { EsppVideo, type EsppProps } from "./espp/Video";
import { FPS, TOTAL_FRAMES } from "./timeline";
import { TOTAL_FRAMES as LOG_FRAMES } from "./workLog/timeline";
import { WorkLogVideo, type WorkLogProps } from "./workLog/Video";
import { IsoAmtVideo, type VideoProps } from "./Video";

const defaultProps: VideoProps = { voiceover: false, music: true, musicVolume: 0.6 };

const doorProps: DoorStickerProps = { music: false, musicVolume: 0.6 };

const logProps: WorkLogProps = { music: true, musicVolume: 0.6 };

const esppProps: EsppProps = { music: true, musicVolume: 0.6 };

export const Root: React.FC = () => (
  <>
    {/* 4:5 for the LinkedIn feed */}
    <Composition
      id="IsoAmt4x5"
      component={IsoAmtVideo}
      width={1080}
      height={1350}
      fps={FPS}
      durationInFrames={TOTAL_FRAMES}
      defaultProps={defaultProps}
    />
    {/* 1:1 variant, same scenes */}
    <Composition
      id="IsoAmt1x1"
      component={IsoAmtVideo}
      width={1080}
      height={1080}
      fps={FPS}
      durationInFrames={TOTAL_FRAMES}
      defaultProps={defaultProps}
    />
    {/* "Loaded to the door sticker" */}
    <Composition
      id="DoorSticker4x5"
      component={DoorStickerVideo}
      width={1080}
      height={1350}
      fps={FPS}
      durationInFrames={DOOR_FRAMES}
      defaultProps={doorProps}
    />
    <Composition
      id="DoorSticker1x1"
      component={DoorStickerVideo}
      width={1080}
      height={1080}
      fps={FPS}
      durationInFrames={DOOR_FRAMES}
      defaultProps={doorProps}
    />
    {/* "Work log": what a few months of client work actually were */}
    <Composition id="WorkLog4x5" component={WorkLogVideo} width={1080} height={1350} fps={FPS} durationInFrames={LOG_FRAMES} defaultProps={logProps} />
    <Composition id="WorkLog1x1" component={WorkLogVideo} width={1080} height={1080} fps={FPS} durationInFrames={LOG_FRAMES} defaultProps={logProps} />
    {/* ESPP: qualifying vs disqualifying dispositions */}
    <Composition id="Espp4x5" component={EsppVideo} width={1080} height={1350} fps={FPS} durationInFrames={ESPP_FRAMES} defaultProps={esppProps} />
    <Composition id="Espp1x1" component={EsppVideo} width={1080} height={1080} fps={FPS} durationInFrames={ESPP_FRAMES} defaultProps={esppProps} />
  </>
);

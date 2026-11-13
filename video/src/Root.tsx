import React from "react";
import { Composition } from "remotion";
import "./fonts";
import { TOTAL_FRAMES as DOOR_FRAMES } from "./doorSticker/timeline";
import { DoorStickerVideo, type DoorStickerProps } from "./doorSticker/Video";
import { FPS, TOTAL_FRAMES } from "./timeline";
import { IsoAmtVideo, type VideoProps } from "./Video";

const defaultProps: VideoProps = { voiceover: false, music: true, musicVolume: 0.6 };

const doorProps: DoorStickerProps = { music: false, musicVolume: 0.6 };

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
  </>
);

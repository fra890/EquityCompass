import React from "react";
import { Composition } from "remotion";
import "./fonts";
import { FPS, TOTAL_FRAMES } from "./timeline";
import { IsoAmtVideo, type VideoProps } from "./Video";

const defaultProps: VideoProps = { music: false, musicVolume: 0.5 };

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
  </>
);

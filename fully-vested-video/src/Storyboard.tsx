import React from 'react';
import {AbsoluteFill, Freeze} from 'remotion';
import {IntroScene} from './Intro';
import {OutroScene} from './Outro';
import {sans, serif} from './fonts';
import type {IntroProps, OutroProps} from './schema';
import {sec, theme} from './theme';

/** Approval sheet: still frames of one composition in both formats. */

const checker =
  'repeating-conic-gradient(#c9ced6 0% 25%, #eef0f3 0% 50%) 0 0 / 48px 48px';

const Thumb: React.FC<{
  frame: number;
  w: number;
  h: number;
  scale: number;
  children: React.ReactNode;
}> = ({frame, w, h, scale, children}) => (
  <div>
    <div
      style={{
        width: w * scale,
        height: h * scale,
        overflow: 'hidden',
        position: 'relative',
        background: checker,
        boxShadow: '0 2px 14px rgba(0,0,0,0.18)',
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          position: 'absolute',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <Freeze frame={frame}>{children}</Freeze>
      </div>
    </div>
    <div style={{fontFamily: sans, fontSize: 22, color: theme.colors.navy, marginTop: 10}}>
      <b>{(frame / theme.timing.fps).toFixed(2)}s</b>
      <span style={{opacity: 0.6}}> · frame {frame}</span>
    </div>
  </div>
);

export const Storyboard: React.FC<{
  kind: 'intro' | 'outro';
  frames: number[];
  introProps: IntroProps;
  outroProps: OutroProps;
}> = ({kind, frames, introProps, outroProps}) => {
  const duration = sec(kind === 'intro' ? theme.timing.introSeconds : theme.timing.outroSeconds);
  const scene = (width: number, height: number) =>
    kind === 'intro' ? (
      <IntroScene {...introProps} width={width} height={height} durationInFrames={duration} muted />
    ) : (
      <OutroScene
        {...outroProps}
        transparent
        showGuides
        width={width}
        height={height}
        durationInFrames={duration}
        muted
      />
    );

  const heading: React.CSSProperties = {
    fontFamily: sans,
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '0.16em',
    color: theme.colors.blue,
    margin: '34px 0 16px',
  };

  return (
    <AbsoluteFill style={{backgroundColor: theme.colors.neutral, padding: 56}}>
      <div style={{fontFamily: serif, fontSize: 52, color: theme.colors.navy}}>
        Fully Vested: {kind === 'intro' ? 'Intro' : 'Outro / End Card'} storyboard
      </div>
      <div style={{fontFamily: sans, fontSize: 22, color: theme.colors.navy, opacity: 0.7, marginTop: 8}}>
        {kind === 'intro'
          ? '3.5s at 30fps. Bar completes on the 2.2s beat. Last 10 frames hold clean.'
          : '12s at 30fps. Pink dashed boxes are preview guides and never render. Checkerboard is transparent in the ProRes 4444 version (solid navy in the MP4).'}
      </div>

      <div style={heading}>16:9 · 1920 × 1080</div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 28}}>
        {frames.map((f) => (
          <Thumb key={f} frame={f} w={1920} h={1080} scale={0.385}>
            {scene(1920, 1080)}
          </Thumb>
        ))}
      </div>

      <div style={heading}>9:16 · 1080 × 1920</div>
      <div style={{display: 'flex', gap: 28}}>
        {frames.map((f) => (
          <Thumb key={f} frame={f} w={1080} h={1920} scale={0.33}>
            {scene(1080, 1920)}
          </Thumb>
        ))}
      </div>
    </AbsoluteFill>
  );
};

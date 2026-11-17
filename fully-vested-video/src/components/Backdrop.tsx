import React from 'react';
import {AbsoluteFill} from 'remotion';
import {theme} from '../theme';

/** Navy field with a soft blue gradient and a fine static grain. */
export const Backdrop: React.FC<{
  style?: React.CSSProperties;
  glowAt?: string;
  grainId?: string;
}> = ({style, glowAt = '28% 78%', grainId = 'grain'}) => {
  const {navy, blue} = theme.colors;
  return (
    <AbsoluteFill style={{backgroundColor: navy, overflow: 'hidden', ...style}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 85% 75% at ${glowAt}, ${blue}66 0%, ${blue}00 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.28) 100%)',
        }}
      />
      <svg
        width="100%"
        height="100%"
        style={{position: 'absolute', inset: 0, opacity: 0.16, mixBlendMode: 'overlay'}}
      >
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} />
      </svg>
    </AbsoluteFill>
  );
};

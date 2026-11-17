import React from 'react';
import {Easing, interpolate} from 'remotion';
import {serif} from '../fonts';
import {clean, theme} from '../theme';

/** "FULLY VESTED" in the serif. resolve goes 0 to 1 as it settles into place. */
export const Wordmark: React.FC<{
  frame: number;
  startFrame: number;
  fontSize: number;
  align?: 'center' | 'left';
}> = ({frame, startFrame, fontSize, align = 'center'}) => {
  const t = interpolate(frame, [startFrame, startFrame + theme.timing.wordmarkFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.6, 0.2, 1),
  });
  const tracking = 0.16 + 0.1 * (1 - t);
  return (
    <div
      style={{
        fontFamily: serif,
        fontWeight: 500,
        fontSize,
        lineHeight: 1,
        letterSpacing: `${tracking}em`,
        // Offset the trailing letter space so centered text is optically centered.
        paddingLeft: align === 'center' ? `${tracking}em` : 0,
        whiteSpace: 'nowrap',
        textAlign: align,
        color: theme.colors.white,
        opacity: t,
        filter: t < 1 ? `blur(${(1 - t) * 10}px)` : undefined,
        transform: `translateY(${(1 - t) * 8}px)`,
      }}
    >
      {clean(theme.series.wordmark)}
    </div>
  );
};

/** Simple fade and rise for supporting lines. */
export const fadeUp = (frame: number, start: number, duration = 14, distance = 10) => {
  const t = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0.6, 0.2, 1),
  });
  return {opacity: t, transform: `translateY(${(1 - t) * distance}px)`};
};

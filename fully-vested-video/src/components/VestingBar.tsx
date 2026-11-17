import React from 'react';
import {Easing, interpolate} from 'remotion';
import {sans} from '../fonts';
import {theme} from '../theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Shared timing for the bar: fills until the beat, then merges.
 * Returns progress (0 to 1) and merge (0 to 1) for a given frame.
 */
export const vestingAt = (
  frame: number,
  opts: {startFrame: number; beatFrame: number; startProgress?: number},
) => {
  const {startFrame, beatFrame, startProgress = 0} = opts;
  const progress = interpolate(frame, [startFrame, beatFrame], [startProgress, 1], {
    ...clamp,
    easing: Easing.bezier(0.5, 0, 0.2, 1),
  });
  const merge = interpolate(frame, [beatFrame, beatFrame + theme.timing.mergeFrames], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.3, 0, 0.1, 1),
  });
  return {progress, merge};
};

/**
 * The vesting schedule: 4 yearly segments with quarterly ticks.
 * progress fills it left to right. merge closes the gaps into one solid bar.
 */
export const VestingBar: React.FC<{
  width: number;
  height: number;
  progress: number;
  merge: number;
  showLabels?: boolean;
  labelSize?: number;
}> = ({width, height, progress, merge, showLabels = true, labelSize = 18}) => {
  const {years, quartersPerYear, yearLabel} = theme.series;
  const {white, navy} = theme.colors;
  const gap = Math.round(height * 1.1) * (1 - merge);
  const segW = (width - gap * (years - 1)) / years;
  const innerRadius = 2 * (1 - merge);
  const outerRadius = height / 2;
  const detail = 1 - merge;

  return (
    <div style={{position: 'relative', width, height}}>
      {Array.from({length: years}).map((_, i) => {
        const local = Math.min(1, Math.max(0, progress * years - i));
        const rl = i === 0 ? outerRadius : innerRadius;
        const rr = i === years - 1 ? outerRadius : innerRadius;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: i * (segW + gap),
              top: 0,
              width: segW + (merge > 0 && i < years - 1 ? 0.6 : 0),
              height,
              borderRadius: `${rl}px ${rr}px ${rr}px ${rl}px`,
              backgroundColor: 'rgba(255,255,255,0.16)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${local * 100}%`,
                backgroundColor: white,
              }}
            />
            {Array.from({length: quartersPerYear - 1}).map((__, q) => (
              <div
                key={q}
                style={{
                  position: 'absolute',
                  left: `${((q + 1) / quartersPerYear) * 100}%`,
                  top: 0,
                  width: 2,
                  marginLeft: -1,
                  height,
                  backgroundColor: navy,
                  opacity: 0.55 * detail,
                }}
              />
            ))}
          </div>
        );
      })}

      {showLabels
        ? Array.from({length: years}).map((_, i) => {
            const reached = Math.min(1, Math.max(0, progress * years - i));
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: i * (segW + gap),
                  top: height + labelSize * 0.9,
                  width: segW,
                  textAlign: 'center',
                  fontFamily: sans,
                  fontWeight: 500,
                  fontSize: labelSize,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: white,
                  opacity: (0.32 + 0.48 * reached) * detail,
                }}
              >
                {yearLabel} {i + 1}
              </div>
            );
          })
        : null}
    </div>
  );
};

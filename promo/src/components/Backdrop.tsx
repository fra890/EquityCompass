import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {color} from '../theme';

// Navy with a slow drift of brand blue behind the type: depth without a
// fourth colour. Corners stay pure navy.
export const Backdrop: React.FC = () => {
	const frame = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	const x = interpolate(frame, [0, durationInFrames], [12, 88]);
	const y = 34 + Math.sin((frame / durationInFrames) * Math.PI * 2) * 8;
	return (
		<AbsoluteFill
			style={{
				backgroundColor: color.navy,
				backgroundImage: `radial-gradient(ellipse 85% 48% at ${x}% ${y}%, rgba(0, 98, 152, 0.26), rgba(0, 98, 152, 0) 72%)`,
			}}
		/>
	);
};

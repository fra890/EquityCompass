import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

// Subtle film grain. Re-seeded every second frame so it lives without buzzing.
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.11}) => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	return (
		<AbsoluteFill style={{mixBlendMode: 'overlay', opacity, pointerEvents: 'none'}}>
			<svg width={width} height={height}>
				<filter id="grain" x="0" y="0" width="100%" height="100%">
					<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={Math.floor(frame / 2) + 1} />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width={width} height={height} filter="url(#grain)" />
			</svg>
		</AbsoluteFill>
	);
};

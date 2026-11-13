import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {copy} from '../copy';
import {Headline} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {T} from '../theme';

export const Turn: React.FC<{dur?: number; lines?: {first: readonly string[]; second: readonly string[]}}> = ({
	dur = T.turn.dur,
	lines = copy.turn,
}) => {
	const frame = useCurrentFrame();
	const {px} = useLayout();
	const secondAt = 28;
	// The problem recedes as the answer arrives.
	const dim = interpolate(frame, [secondAt, secondAt + 14], [1, 0.5], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<Stage dur={dur}>
			<Headline lines={lines.first} at={2} size={px(120)} opacity={dim} />
			<div style={{height: px(64)}} />
			<Headline lines={lines.second} at={secondAt} size={px(120)} accentAt={secondAt + 16} />
		</Stage>
	);
};

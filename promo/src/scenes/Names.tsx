import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {copy} from '../copy';
import {useLayout} from '../layout';
import {color, font, T} from '../theme';

// Rapid-fire cold open. Hard cuts, one name at a time, identical setting for
// every name: plain Source Serif 4, off-white on navy. The last entry holds.
export const Names: React.FC<{items?: readonly string[]; each?: number}> = ({
	items = copy.names,
	each = T.names.each,
}) => {
	const frame = useCurrentFrame();
	const {safeTop, safeBottom, marginX, px} = useLayout();
	const i = Math.min(Math.floor(frame / each), items.length - 1);
	return (
		<AbsoluteFill
			style={{
				paddingTop: safeTop,
				paddingBottom: safeBottom,
				paddingLeft: marginX,
				paddingRight: marginX,
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					fontFamily: font.serif,
					fontSize: px(120),
					fontWeight: 400,
					letterSpacing: '-0.018em',
					lineHeight: 1.1,
					color: color.paper,
					whiteSpace: 'nowrap',
					marginBottom: '4%',
				}}
			>
				{items[i]}
			</div>
		</AbsoluteFill>
	);
};

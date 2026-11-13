import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {useLayout} from '../layout';
import {fadeOut} from '../motion';

// The safe box: nothing typographic leaves it. Header pins to the top of the
// safe area, footer to the bottom, and the body sits optically centred.
export const Stage: React.FC<{
	dur: number;
	header?: React.ReactNode;
	footer?: React.ReactNode;
	children: React.ReactNode;
	align?: 'center' | 'start';
}> = ({dur, header, footer, children, align = 'center'}) => {
	const frame = useCurrentFrame();
	const {safeTop, safeBottom, marginX} = useLayout();
	return (
		<AbsoluteFill style={{opacity: fadeOut(frame, dur)}}>
			<div
				style={{
					position: 'absolute',
					top: safeTop,
					bottom: safeBottom,
					left: marginX,
					right: marginX,
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				<div style={{flex: '0 0 auto'}}>{header}</div>
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: align === 'center' ? 'center' : 'flex-start',
						paddingBottom: align === 'center' ? '4%' : 0,
					}}
				>
					{children}
				</div>
				<div style={{flex: '0 0 auto'}}>{footer}</div>
			</div>
		</AbsoluteFill>
	);
};

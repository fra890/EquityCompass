import React from 'react';
import {useCurrentFrame} from 'remotion';
import {trailer} from '../copy';
import {Headline, MaskLine, Num, Tag} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {easeOut} from '../motion';
import {color, font, paperA} from '../theme';
import {CountUp} from './Ledger';

// The premise: the number arrives before the instructions do.
export const Paper: React.FC<{dur: number}> = ({dur}) => {
	const frame = useCurrentFrame();
	const {px} = useLayout();
	const p = trailer.paper;
	return (
		<Stage
			dur={dur}
			header={
				<Tag size={px(32)} at={0} tone={paperA(0.72)}>
					{p.tag}
				</Tag>
			}
			footer={
				<div style={{fontFamily: font.sans, fontSize: px(32), color: paperA(0.72), opacity: easeOut(frame, 4, 14)}}>
					{p.footnote}
				</div>
			}
		>
			<div style={{color: color.paper}}>
				<MaskLine at={2} style={{fontFamily: font.sans, fontSize: px(54), color: paperA(0.85), lineHeight: 1.2}}>
					{p.lead}
				</MaskLine>
				<div style={{height: px(28)}} />
				<MaskLine at={6} style={{fontSize: px(164), lineHeight: 1.1, marginLeft: '-0.02em'}}>
					<Num>
						<CountUp value={p.value} at={8} dur={46} step={10000} />
					</Num>
				</MaskLine>
				<div
					style={{
						height: px(4),
						background: color.paper,
						marginTop: px(34),
						transform: `scaleX(${easeOut(frame, 8, 46)})`,
						transformOrigin: 'left center',
					}}
				/>
				<div style={{height: px(64)}} />
				<Headline lines={p.lines} at={62} size={px(112)} accentAt={78} />
			</div>
		</Stage>
	);
};

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {copy, teaser} from '../copy';
import {MaskLine, Num, Plate, Rich, Tag} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {easeOut} from '../motion';
import {color, font, paperA} from '../theme';
import {CountUp} from './Ledger';

// Teaser payoff: one number, no working shown. The working is the series.
export const Gap: React.FC<{dur: number}> = ({dur}) => {
	const frame = useCurrentFrame();
	const {px} = useLayout();
	const g = teaser.gap;
	return (
		<Stage
			dur={dur}
			header={
				<Tag size={px(32)} at={0} tone={paperA(0.72)}>
					{g.tag}
				</Tag>
			}
			footer={
				<div
					style={{
						fontFamily: font.sans,
						fontSize: px(32),
						lineHeight: 1.3,
						color: paperA(0.72),
						opacity: easeOut(frame, 4, 14),
					}}
				>
					{copy.ledger.footnote.map((l) => (
						<div key={l}>
							<Rich text={l} />
						</div>
					))}
				</div>
			}
		>
			<div style={{color: color.paper}}>
				<MaskLine at={2} style={{fontFamily: font.sans, fontSize: px(54), color: paperA(0.85), lineHeight: 1.2}}>
					<Rich text={g.lead} />
				</MaskLine>
				<div style={{height: px(40)}} />
				<MaskLine at={8} style={{fontFamily: font.serif, fontSize: px(128), letterSpacing: '-0.018em', lineHeight: 1.1}}>
					{g.label}
				</MaskLine>
				<div style={{height: px(36)}} />
				<MaskLine at={14} style={{fontSize: px(224), lineHeight: 1.08, marginLeft: '-0.02em'}}>
					<Plate at={20} dur={16}>
						<Num>
							<CountUp value={g.value} at={16} dur={28} />
						</Num>
					</Plate>
				</MaskLine>
			</div>
		</Stage>
	);
};

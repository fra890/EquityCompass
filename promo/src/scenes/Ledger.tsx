import React from 'react';
import {useCurrentFrame} from 'remotion';
import {copy} from '../copy';
import {MaskLine, Num, Plate, Rich, Tag} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {easeOut} from '../motion';
import {color, font, paperA, T} from '../theme';

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

// Counts up to the final figure, ease-out, landing exactly on the number.
export const CountUp: React.FC<{value: number; at: number; dur?: number; step?: number}> = ({
	value,
	at,
	dur = 22,
	step = 1000,
}) => {
	const frame = useCurrentFrame();
	const p = easeOut(frame, at, dur);
	// Round to the nearest $1,000 while moving so the digits stay legible.
	const v = p >= 1 ? value : Math.round((value * p) / step) * step;
	return <>{usd(v)}</>;
};

const Rule: React.FC<{at: number; weight: number; tone: string}> = ({at, weight, tone}) => {
	const frame = useCurrentFrame();
	return (
		<div
			style={{
				height: weight,
				background: tone,
				transform: `scaleX(${easeOut(frame, at, 18)})`,
				transformOrigin: 'left center',
			}}
		/>
	);
};

export const Ledger: React.FC = () => {
	const frame = useCurrentFrame();
	const {px} = useLayout();
	const {rows, gap, tag, footnote} = copy.ledger;
	const rowAt = (i: number) => 8 + i * 30;
	const gapAt = 106;

	return (
		<Stage
			dur={T.ledger.dur}
			header={
				<Tag size={px(32)} at={0} tone={paperA(0.72)}>
					{tag}
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
					{footnote.map((l) => (
						<div key={l}>
							<Rich text={l} />
						</div>
					))}
				</div>
			}
		>
			{rows.map((r, i) => (
				<div key={r.label}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'baseline',
							padding: `${px(44)}px 0 ${px(40)}px`,
							color: color.paper,
						}}
					>
						<MaskLine at={rowAt(i)} style={{fontFamily: font.sans, fontSize: px(58), fontWeight: 400}}>
							<Rich text={r.label} />
						</MaskLine>
						<MaskLine at={rowAt(i)} style={{fontSize: px(80)}}>
							<Num>
								<CountUp value={r.value} at={rowAt(i) + 2} />
							</Num>
						</MaskLine>
					</div>
					{i < rows.length - 1 ? (
						<Rule at={rowAt(i)} weight={px(2)} tone={paperA(0.22)} />
					) : (
						// The total line: heavier, as on a ledger.
						<Rule at={gapAt - 6} weight={px(5)} tone={color.paper} />
					)}
				</div>
			))}

			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'baseline',
					paddingTop: px(60),
					color: color.paper,
				}}
			>
				<MaskLine
					at={gapAt}
					style={{fontFamily: font.serif, fontSize: px(96), letterSpacing: '-0.018em', lineHeight: 1.1}}
				>
					{gap.label}
				</MaskLine>
				<MaskLine at={gapAt} style={{fontSize: px(112), lineHeight: 1.1, marginRight: '-0.04em'}}>
					<Plate at={gapAt + 4} dur={16}>
						<Num>
							<CountUp value={gap.value} at={gapAt + 2} />
						</Num>
					</Plate>
				</MaskLine>
			</div>
		</Stage>
	);
};

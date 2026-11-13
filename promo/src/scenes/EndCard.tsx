import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {assets, copy} from '../copy';
import {Headline, MaskLine, Num, Tag} from '../components/Type';
import {useLayout} from '../layout';
import {easeOut} from '../motion';
import {color, font, navyA, paperA} from '../theme';

const LOGO_RATIO = 1801 / 289;

export const EndCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, portrait, safeTop, safeBottom, marginX, px} = useLayout();
	const e = copy.end;

	const epAt = (i: number) => 6 + i * 12;
	const ctaAt = 50;
	const panelAt = 72;
	const panelP = easeOut(frame, panelAt, 18);

	// Portrait: an off-white panel rises from the bottom. Wide: it enters from the right.
	const panelTop = height * 0.515;
	const panelStyle: React.CSSProperties = portrait
		? {left: 0, right: 0, top: panelTop, bottom: 0, transform: `translateY(${(1 - panelP) * 100}%)`}
		: {top: 0, bottom: 0, right: 0, width: width * 0.44, transform: `translateX(${(1 - panelP) * 100}%)`};
	const panelInnerW = portrait ? width - marginX * 2 : width * 0.44 - marginX * 1.4;
	const logoW = Math.min(panelInnerW, px(600));

	return (
		<AbsoluteFill>
			<div
				style={{
					position: 'absolute',
					top: safeTop,
					left: marginX,
					width: portrait ? width - marginX * 2 : width * 0.56 - marginX * 1.5,
					bottom: portrait ? height - panelTop : safeBottom,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: portrait ? 'flex-start' : 'center',
				}}
			>
				<Tag size={px(32)} at={0} tone={paperA(0.72)}>
					{e.tag}
				</Tag>
				<div style={{height: px(22)}} />
				{e.episodes.map((ep, i) => (
					<div
						key={ep.n}
						style={{
							display: 'flex',
							alignItems: 'baseline',
							gap: px(36),
							padding: `${px(11)}px 0`,
							borderBottom: `${px(2)}px solid ${paperA(0.22 * easeOut(frame, epAt(i), 14))}`,
							color: color.paper,
						}}
					>
						<MaskLine at={epAt(i)} dur={14} style={{fontSize: px(54), color: paperA(0.72)}}>
							<Num>{ep.n}</Num>
						</MaskLine>
						<MaskLine
							at={epAt(i)}
							dur={14}
							style={{fontFamily: font.serif, fontSize: px(72), letterSpacing: '-0.018em', lineHeight: 1.15}}
						>
							{ep.title}
						</MaskLine>
					</div>
				))}
				<div style={{height: px(44)}} />
				<div style={{fontFamily: font.sans, fontSize: px(52), lineHeight: 1.2, color: paperA(0.85)}}>
					<MaskLine at={ctaAt}>{e.cadence}</MaskLine>
				</div>
				<div style={{height: px(6)}} />
				<Headline lines={[e.cta]} at={ctaAt + 4} size={px(120)} />
			</div>

			<div style={{position: 'absolute', background: color.paper, ...panelStyle}}>
				<div
					style={{
						position: 'absolute',
						left: portrait ? marginX : marginX * 0.7,
						right: portrait ? marginX : marginX * 0.7,
						top: portrait ? px(44) : 0,
						bottom: portrait ? undefined : 0,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
					}}
				>
					{/* Logo at its native aspect ratio. Multiply only drops the JPEG's white box onto the off-white panel. */}
					<Img
						src={staticFile(assets.logo)}
						style={{width: logoW, height: logoW / LOGO_RATIO, mixBlendMode: 'multiply'}}
					/>
					<div style={{height: px(30)}} />
					<div style={{fontFamily: font.sans, fontSize: px(44), fontWeight: 500, color: color.navy, lineHeight: 1.2}}>
						{e.credit}
					</div>
					<div style={{height: px(4)}} />
					<div style={{fontFamily: font.sans, fontSize: px(44), fontWeight: 600, color: color.blue, lineHeight: 1.2}}>
						{e.url}
					</div>
					<div style={{height: px(20)}} />
					<div style={{fontFamily: font.sans, fontSize: px(32), lineHeight: 1.3, color: navyA(0.85), textWrap: 'pretty'}}>
						{e.disclosure}
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};

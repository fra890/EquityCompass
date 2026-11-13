import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {assets, copy, teaser, trailer} from '../copy';
import {Headline, MaskLine, Num, Tag} from '../components/Type';
import {useLayout} from '../layout';
import {easeOut} from '../motion';
import {color, font, navyA, paperA} from '../theme';

const LOGO_RATIO = 1801 / 289;

export const EndCard: React.FC<{variant?: 'promo' | 'teaser' | 'trailer'}> = ({variant = 'promo'}) => {
	// Teaser and trailer share the short layout: no episode list.
	const isTeaser = variant !== 'promo';
	const short = variant === 'trailer' ? trailer.end : teaser.end;
	const frame = useCurrentFrame();
	const {width, height, portrait, safeTop, safeBottom, marginX, px} = useLayout();
	const e = copy.end;

	const epAt = (i: number) => 6 + i * 12;
	const ctaAt = isTeaser ? 4 : 50;
	const panelAt = isTeaser ? 26 : 72;
	const panelP = easeOut(frame, panelAt, 18);

	// Portrait: an off-white panel rises from the bottom. Wide: it enters from the right.
	const panelTop = height * 0.515;
	const panelStyle: React.CSSProperties = portrait
		? {left: 0, right: 0, top: panelTop, bottom: 0, transform: `translateY(${(1 - panelP) * 100}%)`}
		: {top: 0, bottom: 0, right: 0, width: width * 0.44, transform: `translateX(${(1 - panelP) * 100}%)`};
	const panelInnerW = portrait ? width - marginX * 2 : width * 0.44 - marginX * 1.4;
	// Panel contents settle in one after another once the panel has landed.
	const rise = (i: number): React.CSSProperties => {
		const p = easeOut(frame, panelAt + 10 + i * 4, 14);
		return {opacity: p, transform: `translateY(${(1 - p) * px(14)}px)`};
	};
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
					justifyContent: portrait && !isTeaser ? 'flex-start' : 'center',
				}}
			>
				{isTeaser ? null : (
					<>
						<Tag size={px(32)} at={0} tone={paperA(0.72)}>
							{e.tag}
						</Tag>
						<div style={{height: px(22)}} />
					</>
				)}
				{(isTeaser ? [] : e.episodes).map((ep, i) => (
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
				{isTeaser ? null : <div style={{height: px(44)}} />}
				<div style={{fontFamily: font.sans, fontSize: px(isTeaser ? 56 : 52), lineHeight: 1.2, color: paperA(0.85)}}>
					<MaskLine at={ctaAt}>{isTeaser ? short.cadence : e.cadence}</MaskLine>
				</div>
				<div style={{height: px(isTeaser ? 18 : 6)}} />
				<Headline lines={[isTeaser ? short.cta : e.cta]} at={ctaAt + 4} size={px(isTeaser ? 150 : 120)} />
				{variant === 'trailer' ? (
					<>
						<div style={{height: px(30)}} />
						<div style={{fontFamily: font.sans, fontSize: px(52), fontWeight: 500, lineHeight: 1.2, color: color.paper}}>
							<MaskLine at={ctaAt + 12}>{trailer.end.where}</MaskLine>
						</div>
					</>
				) : null}
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
					<div style={rise(0)}>
						<Img
							src={staticFile(assets.logo)}
							style={{width: logoW, height: logoW / LOGO_RATIO, mixBlendMode: 'multiply', display: 'block'}}
						/>
					</div>
					<div style={{height: px(30)}} />
					<div style={{fontFamily: font.sans, fontSize: px(44), fontWeight: 500, color: color.navy, lineHeight: 1.2, ...rise(1)}}>
						{e.credit}
					</div>
					<div style={{height: px(4)}} />
					<div style={{fontFamily: font.sans, fontSize: px(44), fontWeight: 600, color: color.blue, lineHeight: 1.2, ...rise(2)}}>
						{e.url}
					</div>
					<div style={{height: px(20)}} />
					<div style={{fontFamily: font.sans, fontSize: px(32), lineHeight: 1.3, color: navyA(0.85), textWrap: 'pretty', ...rise(3)}}>
						{e.disclosure}
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};

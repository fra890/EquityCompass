import React from 'react';
import {copy} from '../copy';
import {Headline, MaskLine} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {font, paperA, T} from '../theme';

// Hard cut from the names: the headline is simply there. Only the smaller
// second line moves.
export const Here: React.FC<{dur?: number; afterAt?: number}> = ({dur = T.here.dur, afterAt = 30}) => {
	const {px} = useLayout();
	return (
		<Stage dur={dur}>
			<Headline lines={copy.here.lines} at={-100} size={px(108)} />
			<div style={{height: px(56)}} />
			<div style={{fontFamily: font.serif, fontSize: px(72), lineHeight: 1.15, letterSpacing: '-0.012em', color: paperA(0.78)}}>
				<MaskLine at={afterAt}>{copy.here.after}</MaskLine>
			</div>
		</Stage>
	);
};

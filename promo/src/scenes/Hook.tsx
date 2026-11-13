import React from 'react';
import {copy} from '../copy';
import {Headline} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {T} from '../theme';

export const Hook: React.FC<{dur?: number; secondAt?: number}> = ({dur = T.hook.dur, secondAt = 42}) => {
	const {px} = useLayout();
	return (
		<Stage dur={dur}>
			<Headline lines={copy.hook.first} at={3} size={px(120)} />
			<div style={{height: px(64)}} />
			<Headline lines={copy.hook.second} at={secondAt} size={px(120)} accentAt={secondAt + 16} />
		</Stage>
	);
};

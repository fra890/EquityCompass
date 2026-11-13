import React from 'react';
import {copy} from '../copy';
import {Headline} from '../components/Type';
import {Stage} from '../components/Stage';
import {useLayout} from '../layout';
import {T} from '../theme';

export const Hook: React.FC = () => {
	const {px} = useLayout();
	return (
		<Stage dur={T.hook.dur}>
			<Headline lines={copy.hook.first} at={3} size={px(120)} />
			<div style={{height: px(64)}} />
			<Headline lines={copy.hook.second} at={42} size={px(120)} accentAt={58} />
		</Stage>
	);
};

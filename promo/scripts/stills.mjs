// Renders one approval still per beat.
//   npm run stills          -> full promo, into stills/
//   npm run stills:teaser   -> teaser cut, into stills/teaser/
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';

const sets = {
	Promo: {
		dir: 'stills',
		beats: [
			['01a-names', 20],
			['01b-names-hold', 60],
			['02-if-you-work-here', 136],
			['03-hook', 214],
			['04-math', 386],
			['05-card-isos', 436],
			['06-card-lockup', 500],
			['07-card-ticker', 578],
			['08-turn', 652],
			['09-title', 738],
			['10-end', 930],
		],
	},
	Teaser: {
		dir: 'stills/teaser',
		beats: [
			['01-names', 20],
			['02-names-hold', 60],
			['03-if-you-work-here', 120],
			['04-hook', 198],
			['05-gap', 302],
			['06-flash-a', 320],
			['07-flash-b', 336],
			['08-flash-c', 354],
			['09-title', 434],
			['10-end', 586],
		],
	},
};

const args = process.argv.slice(2);
const id = sets[args[0]] ? args.shift() : 'Promo';
const {dir, beats} = sets[id];

mkdirSync(dir, {recursive: true});
for (const [name, frame] of beats) {
	execFileSync(
		'npx',
		['remotion', 'still', 'src/index.ts', id, `${dir}/${name}.png`, `--frame=${frame}`, '--log=error', ...args],
		{stdio: 'inherit'},
	);
	console.log(`${dir}/${name}.png  (frame ${frame})`);
}

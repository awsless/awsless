import chalk from 'chalk'

export const icon = {
	// info: 'ℹ',
	// success: '✓',
	// warning: '⚠',
	// question: '?',
	error: '×',

	dot: '·',
	// line: '─',
	// ellipsis: '…',
	arrow: {
		top: '^',
		right: '›',
	},
	// pointer: '❯',
}

export const color = {
	primary: chalk.bold.hex('#FF9000'),
	// primary: chalk.bold.magentaBright,
	// title: chalk.white,
	normal: chalk.reset.white,
	label: chalk.reset.white.bold,
	dim: chalk.dim,
	line: chalk.black,

	// link: chalk.cyan,

	info: chalk.blue,
	success: chalk.green,
	warning: chalk.yellow,
	error: chalk.red,

	attr: chalk.yellow,

	// cursor: chalk.bgWhite.blackBright,
}

export const char = {
	br: '\n',
}

// export const symbol = {
// 	// arrowUp: '↑',
// 	// arrowDown: '↓',
// 	// arrowLeft: '←',
// 	// arrowRight: '→',

// 	// radioOn: '◉',
// 	// radioOff: '◯',

// 	info: 'ℹ',
// 	success: '✔',
// 	warning: '⚠',
// 	question: '?',
// 	error: '✖',

// 	ellipsis: '…',
// 	pointerSmall: '›',
// 	// line: '─',
// 	pointer: '❯',

// 	// info: style.info('ℹ'),
// 	// success: style.success('✔'),
// 	// warning: style.warning('⚠'),
// 	// error: style.error('✖'),
// 	// input: style.success('?')
// }

// // export

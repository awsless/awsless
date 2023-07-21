
import chalk from 'chalk'

export const symbol = {
	info: 'ℹ',
	success: '✔',
	warning: '⚠',
	question: '?',
	error: '✖',

	ellipsis: '…',
	pointerSmall: '›',
	// line: '─',
	pointer: '❯',
}

export const style = {
	primary: chalk.bold.hex('#FF9000'),
	// title: chalk.white,
	normal: chalk.white,
	label: chalk.white.bold,
	placeholder: chalk.dim,

	link: chalk.cyan,

	info: chalk.blue,
	success: chalk.green,
	warning: chalk.yellow,
	error: chalk.red,

	attr: chalk.yellow,

	cursor: chalk.bgWhite.blackBright
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

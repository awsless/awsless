import { color as chalk } from '@awsless/clui'

export const icon = {
	error: '×',

	dot: '·',
	arrow: {
		top: '^',
		right: '›',
	},
}

export const color = {
	primary: chalk.bold.hex('#FF9000'),
	normal: chalk.reset.white,
	label: chalk.reset.white.bold,
	dim: chalk.dim,
	line: chalk.black,

	info: chalk.blue,
	success: chalk.green,
	warning: chalk.yellow,
	error: chalk.red,

	attr: chalk.yellow,
}

export const char = {
	br: '\n',
}

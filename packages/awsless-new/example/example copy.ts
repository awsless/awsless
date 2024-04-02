// import { program } from '../src/cli/program.js'

// // process.env.AWSLESS_CLI = '1'
// program.parse('awsless ')

import * as p from '@clack/prompts'
import { style } from '../src/cli/ui/style.js'
import chalk from 'chalk'
import wrapAnsi from 'wrap-ansi'

console.log()

// style.warning('⚡️'), style.primary('AWS'), style.primary.dim('LESS')

p.intro(`${style.primary('AWS')}${style.primary.dim('LESS')} ${chalk.dim('deploy')}`)

// await p.password({
// 	message: 'What is your name?',
// 	mask: '*',
// })

p.note(wrapAnsi('a '.repeat(100), process.stdout.columns - 8))

p.note(chalk.reset.cyan(wrapAnsi('a '.repeat(100), process.stdout.columns - 8)), 'Lol')

p.log.message('Lol', { symbol: chalk.red`×` })
p.log.message(wrapAnsi('a '.repeat(100), process.stdout.columns - 8))
p.log.step('LOL')

// p.log.success('LOL')
// p.log.error('LOL')
// p.log.warn('LOL')
// p.log.info('lol')

// await p.multiselect({
// 	message: 'Select the stacks to deploy',
// 	required: true,
// 	options: [
// 		{ value: 'one', label: 'one' },
// 		{ value: 'two', label: 'two' },
// 		{ value: 'three', label: 'three' },
// 		{ value: 'four', label: 'four' },
// 	],
// })

// p.cancel('Failed...')

// const s = p.spinner()
// s.start('Load AWS profile...')
// await new Promise(r => setTimeout(r, 3000))
// s.stop('Done')

p.outro('Deployed!')

//

p.intro(chalk.bgYellowBright.blackBright.bold` Debug Log `)
p.log.message('Lol', { symbol: chalk.yellow`·` })
p.outro()

// await clack.group(
// 	{
// 		name: () => text({ message: 'What is your name?' }),
// 		age: () => text({ message: 'What is your age?' }),
// 		color: ({ results }) =>
// 			multiselect({
// 				message: `What is your favorite color ${results.name}?`,
// 				options: [
// 					{ value: 'red', label: 'Red' },
// 					{ value: 'green', label: 'Green' },
// 					{ value: 'blue', label: 'Blue' },
// 				],
// 			}),
// 	},
// 	{
// 		// On Cancel callback that wraps the group
// 		// So if the user cancels one of the prompts in the group this function will be called
// 		onCancel: ({ results }) => {
// 			cancel('Operation cancelled.')
// 			process.exit(0)
// 		},
// 	}
// )

// outro('World')

// console.log('lol')

// ${style.warning('⚡️')}

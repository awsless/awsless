import { spinner } from '@clack/prompts'
import { styleText } from 'node:util'
import { ansi, color, log } from '../src'

type TaskOptions<T> = {
	initialMessage: string
	errorMessage?: string
	successMessage?: string
	task: (updateMessage: (message: string) => void) => Promise<T>
}

let endMargin = 3

export const task = async <T>(opts: TaskOptions<T>): Promise<T> => {
	let last: string | undefined
	const spin = spinner()
	spin.start(opts.initialMessage)

	const stop = (message?: string, code?: number) => {
		spin.stop(ansi.truncate(message ?? last ?? opts.initialMessage, process.stdout.columns - 6 - endMargin), code)
	}

	try {
		const result = await opts.task(m => {
			spin.message(ansi.truncate(m, process.stdout.columns - 6 - endMargin))
			last = m
		})

		stop(opts.successMessage)
		return result
	} catch (error) {
		stop(opts.errorMessage, 2)
		throw error
	}
}

// await task({
// 	initialMessage: '',
// 	task: async updateMessage => {
// 		updateMessage(color.gray.dim('▌'))
// 		await new Promise(resolve => setTimeout(resolve, 1000))
// 		updateMessage(
// 			[
// 				//
// 				// 'Loading...\n',
// 				// color.green('⬩'),
// 				// color.yellow('⬩'),
// 				// color.yellow('⬩'),
// 				// color.gray.dim('⬩⬩⬩⬩'),
// 				color.green('▌▌▌'),
// 				color.red('▌'),
// 				color.yellow('▌▌'),
// 				color.gray.dim('▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌'),
// 			].join('')
// 		)
// 		await new Promise(resolve => setTimeout(resolve, 1000))
// 		// updateMessage('▌▌▌▌▌▌▌▌▌')
// 		return
// 	},
// })

// const i = '▌'
const i = '▪'

log.intro('♣♠')
log.note('lol', 'lol')
console.log(
	[
		color.gray('│'),
		color.gray('◇  Deploying Resources ────────────────────────╮'),
		color.gray('│                                              │'),
		[
			//
			// 'Loading...\n',
			// color.green('⬩'),
			// color.yellow('⬩'),
			// color.yellow('⬩'),
			// color.gray.dim('⬩⬩⬩⬩'),
			color.gray('│  '),
			color.gray(i.repeat(3)),
			color.red(i.repeat(3)),
			color.yellow(i.repeat(3)),
			color.green(i.repeat(3)),
			color.cyan(i.repeat(3)),
			color.blue(i.repeat(3)),
			color.magenta(i.repeat(3)),
			color.red(i.repeat(3)),
			color.yellow(i.repeat(3)),
			color.green(i.repeat(3)),
			color.gray(i.repeat(3)),
			color.gray('  │'),
			styleText('bold', 'Test'),
		].join(''),
		color.gray('│                                              │'),
		// color.gray.dim('▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌'),
		color.gray('├──────────────────────────────────────────────╯'),
	].join('\n')
)
log.outro('Foot')

// process.exit()

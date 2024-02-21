import { promise } from 'fastq'
import { Signal } from '../../lib/signal.js'
import { Terminal } from '../../lib/terminal.js'
import { style, symbol } from '../../style.js'
import { br } from '../layout/basic.js'
import { padText } from '../layout/pad-text.js'
import { createSpinner } from '../layout/spinner.js'

type Status = 'done' | 'fail' | 'warn'

type Task = {
	label: string
	task: (update: (status: string) => void) => Promise<Status>
}

export const runTaskGroup = (concurrency: number, tasks: Task[]) => {
	const formatLabel = padText(tasks.map(task => task?.label ?? ''))

	return async (term: Terminal) => {
		const queue = promise(async (task: Task) => {
			const [icon, stop] = createSpinner()
			const status = new Signal('')
			const entry = new Signal([
				icon,
				' ',
				style.label(formatLabel(task.label)),
				' ',
				style.placeholder(symbol.pointerSmall),
				' ',
				status,
				br(),
			])

			term.out.write(entry)

			let result: Status

			try {
				result = await task.task((text: string) => {
					status.set(text)
				})
			} catch (error) {
				icon.set(style.error(symbol.error))
				status.update(style.error)
				throw error
			} finally {
				stop()
			}

			switch (result) {
				case 'done':
					icon.set(style.success(symbol.success))
					status.update(style.success)
					break
				case 'fail':
					icon.set(style.error(symbol.error))
					status.update(style.error)
					break
				case 'warn':
					icon.set(style.warning(symbol.warning))
					status.update(style.warning)
					break
			}
		}, concurrency)

		const results = await Promise.allSettled(
			tasks.map(task => {
				return queue.push(task)
			})
		)

		for (const result of results) {
			if (result.status === 'rejected') {
				throw result.reason
			}
		}
	}
}

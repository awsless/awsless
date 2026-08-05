import { Stack } from '../../../formation/stack.js'
import { Signal } from '../../lib/signal.js'
import { Terminal } from '../../lib/terminal.js'
import { style, symbol } from '../../style.js'
import { br } from '../layout/basic.js'
import { flexLine } from '../layout/flex-line.js'
import { createSpinner } from '../layout/spinner.js'

export const stacksDeployer = (deploymentLine: Stack[][]) => {
	const stackNames = deploymentLine.map(line => line.map(stack => stack.name)).flat()
	const stackNameSize = Math.max(...stackNames.map(name => name.length))

	return (term: Terminal) => {
		const ui: Record<
			string,
			{
				start: (status: string) => void
				done: (status: string) => void
				fail: (status: string) => void
				warn: (status: string) => void
			}
		> = {}

		term.out.gap()

		for (const i in deploymentLine) {
			const line = flexLine(term, ['  '], [' ', style.placeholder(Number(i) + 1), style.placeholder(' ──')])

			term.out.write(line)
			term.out.write(br())

			for (const stack of deploymentLine[i]) {
				const icon = new Signal<Signal<string> | string>(' ')
				const name = new Signal(style.label.dim(stack.name))
				const status = new Signal(style.info.dim('waiting'))
				let stopSpinner: () => void

				term.out.write([
					icon,
					' ',
					name,
					' '.repeat(stackNameSize - stack.name.length),
					' ',
					style.placeholder(symbol.pointerSmall),
					' ',
					status,
					br(),
				])

				ui[stack.name] = {
					start: value => {
						const [spinner, stop] = createSpinner()
						name.set(style.label(stack.name))
						icon.set(spinner)
						status.set(style.warning(value))
						stopSpinner = stop
					},
					done(value) {
						stopSpinner()
						icon.set(style.success(symbol.success))
						status.set(style.success(value))
					},
					fail(value) {
						stopSpinner()
						icon.set(style.error(symbol.error))
						status.set(style.error(value))
					},
					warn(value) {
						stopSpinner()
						icon.set(style.warning(symbol.warning))
						status.set(style.warning(value))
					},
				}
			}
		}

		term.out.write(flexLine(term, ['  '], [' ', style.warning('⚡️'), style.placeholder('──')]))

		term.out.gap()

		return ui
	}
}

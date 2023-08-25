import { StackNode } from '../../../util/deployment.js';
import { Signal } from '../../lib/signal.js';
import { Terminal } from '../../lib/terminal.js';
import { style } from '../../style.js';
import { br } from '../layout/basic.js';
import { flexLine } from '../layout/flex-line.js';

export const stackTree = (nodes:StackNode[], statuses:Record<string, Signal<string>>) => {
	return (term: Terminal) => {
		const render = (nodes:StackNode[], deep = 0, parents: boolean[] = []) => {
			const size = nodes.length - 1
			nodes.forEach((node, i) => {
				const name = node.stack.name
				const status = statuses[name]

				const first = i === 0 && deep === 0
				const last = i === size
				const more = i < size

				const line = flexLine(term, [
					...parents.map((parent) => {
						return style.label(
							parent
							? '│'.padEnd(3)
							: ' '.repeat(3)
						)
					}),
					style.label(
						first && size === 0
						? '  '
						: first
						? '┌─'
						: last
						? '└─'
						: '├─'
					),
					' ',
					style.info(name),
					' ',
				],[
					' ',
					status,
					br(),
				])

				term.out.write(line)

				render(node.children, deep + 1, [ ...parents, more ])
			})
		}

		term.out.gap()
		render(nodes)
		term.out.gap()
	}
}

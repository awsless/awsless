import { StackNode } from '../../../util/deployment.js';
import { Signal } from '../../lib/signal.js';
import { Terminal } from '../../lib/terminal.js';
import { style } from '../../style.js';
import { br } from '../layout/basic.js';
import { flexLine } from '../layout/flex-line.js';

// const stripEscapeCode = (str:string) => {
// 	return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
// }

// const getLine = (windowWidth:number, name:string, status:string, deep:number) => {
// 	const usedWidth = stripEscapeCode(name).length + stripEscapeCode(status).length + (deep * 3) + 9
// 	// const width = Math.min(windowWidth, 50) - usedWidth
// 	return style.placeholder('─'.repeat(windowWidth - usedWidth))
// }

export const stackTree = (nodes:StackNode[], statuses:Record<string, Signal<string>>) => {
	return (term: Terminal) => {
		const render = (nodes:StackNode[], deep = 0, parents: boolean[] = []) => {
			const size = nodes.length - 1
			nodes.forEach((node, i) => {
				const id = node.stack.artifactId
				const status = statuses[id]

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
					style.info(id),
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

		render(nodes)
	}
}

import { StackNode } from "../../../util/deployment";
import { Signal, derive } from "../../lib/signal";
import { Terminal } from "../../lib/terminal";
import { style } from "../../style";
import { br } from "../layout/basic";

const stripEscapeCode = (str:string) => {
	return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
}

const getLine = (windowWidth:number, name:string, status:string, deep:number) => {
	const usedWidth = stripEscapeCode(name).length + stripEscapeCode(status).length + (deep * 3) + 9
	// const width = Math.min(windowWidth, 50) - usedWidth
	return style.placeholder('─'.repeat(windowWidth - usedWidth))
}

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

				parents.forEach((parent) => {
					term.out.write(style.label(
						parent
						? '│'.padEnd(3)
						: ' '.repeat(3)
					))
				})

				// const hr = new Signal(getLine(term.out.width(), id, status.get(), deep))

				// status.subscribe(value => {
				// 	hr.set(getLine(term.out.width(), id, value, deep))
				// })

				const hr = derive([ status ] as const, (status) => {
					return getLine(term.out.width(), id, status, deep)
				})

				term.out.write(style.label(
					first && size === 0
					? '  '
					: first
					? '┌─'
					: last
					? '└─'
					: '├─'
				))

				term.out.write([
					' ',
					style.info(id),
					' ',
					hr,
					style.placeholder(' [ '),
					status,
					style.placeholder(' ] '),
					br(),
				])

				render(node.children, deep + 1, [ ...parents, more ])
			})
		}

		render(nodes)
	}
}

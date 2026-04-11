import { Interface } from './interface.js'
import { Renderer } from './renderer.js'

export type Terminal = {
	in: Interface
	out: Renderer
}

export const createTerminal = (input = process.stdin, output = process.stdout): Terminal => {
	const ins = new Interface(input)
	const outs = new Renderer(output, ins)
	return { in: ins, out: outs }
}

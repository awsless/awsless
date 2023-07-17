import { style } from "../../../../src/cli/style"
import { Fragment, Render, Terminal } from "../terminal"

export const line = (value:Fragment): Fragment => {
	return [ value, br() ]
}

export const br = () => {
	return '\n'
}

export const hr = (): Render => {
	return (term:Terminal) => {
		const hr = '─'.repeat(term.width())
		term.write(style.placeholder(hr))
		term.write(`\n`)
	}
}

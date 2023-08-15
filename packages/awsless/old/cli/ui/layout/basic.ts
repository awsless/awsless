import { RenderFactory } from "../../lib/renderer.js"
import { style } from "../../style.js"

// export const line = (value:Fragment) => {
// 	return [ value, br() ]
// }

export const br = () => {
	return '\n'
}

export const hr = (): RenderFactory => {
	return (term) => {
		term.out.write([
			style.placeholder('─'.repeat(term.out.width())),
			br(),
		])
	}
}

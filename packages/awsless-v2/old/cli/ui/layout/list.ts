import { RenderFactory } from '../../lib/renderer.js'
import { style } from '../../style.js'
import { br } from './basic.js'
import { padText } from './pad-text.js'

export const list = (data: Record<string, string>): RenderFactory => {
	const padding = 2
	const padName = padText(Object.keys(data))

	return term => {
		term.out.gap()
		term.out.write(
			Object.entries(data).map(([name, value]) => [
				' '.repeat(padding),
				style.label(padName(name + ':', 2)),
				value,
				br(),
			])
		)
		term.out.gap()
	}
}

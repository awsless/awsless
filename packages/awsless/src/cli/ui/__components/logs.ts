import { flushDebug } from "../../logger.js"
import { style } from "../../style.js"
import { br, hr } from "./basic.js"

let previous = new Date()

export const logs = () => {
	if(!process.env.VERBOSE) {
		return []
	}

	const logs = flushDebug()

	return [
		hr(),
		br(),
		' '.repeat(3),
		style.label('Debug Logs:'),
		br(),
		br(),
		logs.map(log => {
			const diff = log.date.getTime() - previous.getTime()
			const time = `+${diff}`.padStart(7)
			previous = log.date

			return [
				style.attr(`${time}${style.attr.dim('ms')}`),
				' [ ', log.type, ' ] ',
				log.message,
				br(),
				log.type === 'error' ? br() : '',
			]
		}),
		br(),
		hr(),
	]
}

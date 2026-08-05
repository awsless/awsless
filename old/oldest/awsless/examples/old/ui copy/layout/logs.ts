import { flushDebug } from "../../logger"
import { style } from "../../style"
import { Fragment } from "../../__ui copy/terminal"
import { br, hr } from "./basic"

let previous = new Date()

export const logs = (): Fragment => {
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
				style.time(`${time}${style.time.dim('ms')}`),
				' [ ', log.type, ' ] ',
				log.message,
				br(),
			]
		}),
		br(),
		hr(),
	]
}

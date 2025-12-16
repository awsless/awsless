import wrapAnsi from 'wrap-ansi'
import { flushDebug } from '../../logger.js'
import { style } from '../../style.js'
import { br, hr } from './basic.js'
import { Terminal } from '../../lib/terminal.js'

let previous = new Date()

export const logs = () => {
	if (!process.env.VERBOSE) {
		return []
	}

	const logs = flushDebug()

	return (term: Terminal) => {
		term.out.gap()
		term.out.write([
			hr(),
			br(),
			' '.repeat(2),
			style.label('Debug Logs:'),
			br(),
			br(),
			logs.map(log => {
				const diff = log.date.getTime() - previous.getTime()
				const time = `+${diff}`.padStart(6)
				previous = log.date

				return wrapAnsi(
					[
						style.attr(`${time}${style.attr.dim('ms')}`),
						' [ ',
						log.type,
						' ] ',
						log.message,
						br(),
						log.type === 'error' ? br() : '',
					].join(''),
					term.out.width(),
					{ hard: true, trim: false }
				)
			}),
			br(),
			hr(),
		])
	}
}

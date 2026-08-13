import { log } from '@clack/prompts'
import { FileError } from '../../../error.js'
import { wrap } from '../util.js'
import { color, icon } from '../style.js'

export const logFileError = (error: FileError) => {
	log.message(
		wrap([color.error(error.message), color.dim(error.file)].join('\n'), {
			hard: true,
		}),
		{ symbol: color.error(icon.error) }
	)
}

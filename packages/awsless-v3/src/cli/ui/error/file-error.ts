// import { log } from '@clack/prompts'
import { log } from '@awsless/clui'
import { FileError } from '../../../error.js'
import { color } from '../style.js'

export const logFileError = (error: FileError) => {
	log.error(
		[color.error(error.message), color.dim(error.file)].join('\n')
		// { symbol: color.error(icon.error) }
	)
}

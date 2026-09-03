import { log } from '@awsless/clui'
import { ResourceError } from '@terraforge/core'
import { capitalCase } from 'change-case'
import { color } from '../style.js'
import { wrap } from '../util.js'

const formatOperation = (operation: ResourceError['operation']) => {
	const value = ` ${capitalCase(operation)} `

	switch (operation) {
		case 'create':
		case 'import':
			return color.success.bold.inverse(value)
		case 'update':
		case 'replace':
			return color.warning.bold.inverse(value)
		case 'delete':
			return color.error.bold.inverse(value)
		case 'get':
		case 'resolve':
			return color.info.bold.inverse(value)
	}

	return color.primary.bold.inverse(value)
}

export const logResourceError = (error: ResourceError | Error) => {
	if (error instanceof ResourceError) {
		log.error(
			[
				formatOperation(error.operation),
				'\n',
				wrap(error.urn, { hard: true }),
				'\n\n',
				wrap(color.error(error.message), { hard: true }),
			].join('')
		)
	} else if (error instanceof Error) {
		log.error(wrap(color.error(error.message), { hard: true }))
	}
}

import { log } from '@awsless/clui'
import { ResourceError } from '@awsless/formation'
import { capitalCase } from 'change-case'
import { color } from '../style.js'
import { wrap } from '../util.js'

const formatOperation = (operation: string) => {
	const value = ` ${capitalCase(operation)} `

	switch (operation) {
		case 'create':
		case 'import':
			return color.success.bold.inverse(value)
		case 'update':
			return color.warning.bold.inverse(value)
		case 'delete':
			return color.error.bold.inverse(value)
		case 'heal':
			return color.warning.bold.inverse(value)
		case 'get':
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
				// '\n',
				// wrap('ID: ' + issue.id ?? '', { hard: true }),
				'\n\n',
				wrap(color.error(error.message), { hard: true }),
				// , '\n', color.error(issue.message)
			].join('')
		)
	} else if (error instanceof Error) {
		log.error(wrap(color.error(error.message), { hard: true }))
	}
}

// export const logResourceError = (error: ResourceError | Error) => {
// 	// log.message(
// 	// 	wrap([color.error(error.message), `Stack: ${error.stack}`].join('\n'), {
// 	// 		hard: true,
// 	// 	}),
// 	// 	{ symbol: color.error(icon.error) }
// 	// )

// 	// // console.log(error)

// 	for (const issue of error.issues) {
// 		if (issue instanceof ResourceError) {
// 			log.message(
// 				[
// 					formatOperation(issue.operation),
// 					'\n',
// 					wrap(issue.urn, { hard: true }),
// 					// '\n',
// 					// wrap('ID: ' + issue.id ?? '', { hard: true }),
// 					'\n\n',
// 					wrap(color.error(issue.message), { hard: true }),
// 					// , '\n', color.error(issue.message)
// 				].join(''),
// 				{ symbol: color.error(icon.error) }
// 			)
// 		} else if (issue instanceof Error) {
// 			log.message(wrap(color.error(issue.message), { hard: true }), {
// 				symbol: color.error(icon.error),
// 			})
// 		}
// 	}
// }

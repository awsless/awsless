import { ResourceOperation, StackError } from '@awsless/formation'
import { log } from '@clack/prompts'
import { color, icon } from '../style.js'
import { wrap } from '../util.js'
import { capitalCase } from 'change-case'

const formatOperation = (operation: ResourceOperation) => {
	const value = ` ${capitalCase(operation)} `
	switch (operation) {
		case 'create':
			return color.success.bold.inverse(value)
		case 'update':
			return color.warning.bold.inverse(value)
		case 'delete':
			return color.error.bold.inverse(value)
		case 'heal':
			return color.warning.bold.inverse(value)
	}
}

export const logStackError = (error: StackError) => {
	log.message(
		wrap([color.error(error.message)], {
			hard: true,
		}),
		{ symbol: color.error(icon.error) }
	)

	for (const issue of error.issues) {
		if (issue.operation === 'create') color.error.bold.inverse(` ${capitalCase(issue.operation)} `)
		log.message(
			[
				formatOperation(issue.operation) + ' ',
				wrap(issue.urn, { hard: true }),
				'\n\n',
				wrap(color.error(issue.message), { hard: true }),
				// , '\n', color.error(issue.message)
			].join(''),
			{ symbol: color.error(icon.error) }
		)
	}
}

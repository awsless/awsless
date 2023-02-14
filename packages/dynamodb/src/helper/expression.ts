
import { Expression } from '../types.js'

interface Command {
	ExpressionAttributeNames?: object
	ExpressionAttributeValues?: object
}

export const addExpression = (command: Command, expression:Expression) => {
	const names = { ...(command.ExpressionAttributeNames || {}), ...expression.names }
	const values = { ...(command.ExpressionAttributeValues || {}), ...expression.values }

	if(Object.keys(names).length) {
		command.ExpressionAttributeNames = names
	}

	if(Object.keys(values).length) {
		command.ExpressionAttributeValues = values
	}
}

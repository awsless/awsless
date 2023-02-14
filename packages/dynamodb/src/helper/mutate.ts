
import { DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { MutateOptions } from '../types.js'
import { addExpression } from './expression.js'

export const extendMutateCommand = (command: PutCommand | DeleteCommand | UpdateCommand, options:MutateOptions) => {
	if(options.return) {
		command.input.ReturnValues = options.return
	}

	if(options.condition) {
		command.input.ConditionExpression = options.condition.expression
		addExpression(command.input, options.condition)
	}
}

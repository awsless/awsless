
import { DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ExpressionBuilder, ExpressionNames, IDGenerator, MutateOptions } from '../types.js'
import { addExpression } from './expression.js'

export const extendMutateCommand = (command: PutCommand | DeleteCommand | UpdateCommand, gen:IDGenerator, options:MutateOptions) => {
	if(options.return) {
		command.input.ReturnValues = options.return
	}

	if(options.condition) {
		const condition = options.condition(gen)
		command.input.ConditionExpression = condition.query
		addExpression(command.input, condition)
	}
}

// export const addReturnValues = (input:{ ReturnValues?:boolean }, options:{ return?:boolean }) => {
// 	if(options.return) {
// 		input.ReturnValues = options.return
// 	}
// }

// export const addConditionExpression = (input:{ ConditionExpression:string }, options:{ condition?: ExpressionBuilder }, gen:IDGenerator) => {
// 	if(options.condition) {
// 		const condition = options.condition(gen)
// 		input.ConditionExpression = condition.query
// 		addExpression(input, condition)
// 	}
// }

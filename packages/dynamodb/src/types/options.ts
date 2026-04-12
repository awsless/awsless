import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
// import { ConditionExpression } from '../expression/condition'
// import { ReturnValues } from '../expression/return'
// import { AnyTable } from '../table'

export type Options = {
	client?: DynamoDBClient
}

// export interface MutateOptions<T extends AnyTable, R extends ReturnValues> extends Options {
// 	when?: ConditionExpression<T>
// 	return?: R
// }

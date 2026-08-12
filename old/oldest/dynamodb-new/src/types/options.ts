import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Combine, Condition } from '../expressions/condition'
import { ReturnValues } from '../expressions/return'
import { AnyTable } from '../table'

export interface Options {
	client?: DynamoDBClient
	debug?: boolean
}

export interface MutateOptions<T extends AnyTable, R extends ReturnValues = 'NONE'> extends Options {
	condition?: (exp: Condition<T>) => Combine<T>
	return?: R
}

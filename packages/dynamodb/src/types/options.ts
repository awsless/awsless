
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { Condition } from "../expressions/conditions"
import { ReturnValues } from "../expressions/return"
import { AnyTableDefinition } from "../table"

export interface Options {
	client?: DynamoDBClient
}

export interface MutateOptions<T extends AnyTableDefinition, R extends ReturnValues = 'NONE'> extends Options {
	condition?: (exp:Condition<T>) => void
	return?: R
}

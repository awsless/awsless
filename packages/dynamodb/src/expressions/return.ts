
import { AnyTableDefinition } from "../table"

export type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'

export type LimitedReturnValues = 'NONE' | 'ALL_OLD'

export type ReturnResponse<T extends AnyTableDefinition, R extends ReturnValues | LimitedReturnValues = 'NONE'> = (
	R extends 'NONE'
	? void
	: R extends 'ALL_NEW' | 'ALL_OLD'
	? T['schema']['OUTPUT'] | undefined
	: Partial<T['schema']['OUTPUT']> | undefined
)

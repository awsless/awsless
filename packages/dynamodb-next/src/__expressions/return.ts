import { AnyTable, Output } from '../table'

export type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'

export type LimitedReturnValues = 'NONE' | 'ALL_OLD'

export type ReturnResponse<T extends AnyTable, R extends ReturnValues = 'NONE'> = R extends 'NONE'
	? void
	: R extends 'ALL_NEW' | 'ALL_OLD'
		? Output<T> | undefined
		: Partial<Output<T>> | undefined

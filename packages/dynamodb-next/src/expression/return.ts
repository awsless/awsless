import { AnyTable, Infer } from '../table'

export type UpdateReturnValue = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
export type ReturnValue = 'NONE' | 'ALL_OLD'

export type UpdateReturnResponse<T extends AnyTable, R extends UpdateReturnValue> = UpdateReturnValue extends R
	? void
	: R extends 'NONE'
		? void
		: R extends 'ALL_NEW'
			? Infer<T>
			: R extends 'ALL_OLD'
				? Infer<T> | undefined
				: R extends 'UPDATED_NEW'
					? Partial<Infer<T>>
					: Partial<Infer<T>> | undefined

export type ReturnResponse<T extends AnyTable, R extends ReturnValue> = ReturnValue extends R
	? void
	: R extends 'NONE'
		? void
		: Infer<T> | undefined

// export type PutReturnResponse<T extends AnyTable, R extends LimitedReturnValue> = LimitedReturnValue extends R
// 	? void
// 	: R extends 'NONE'
// 		? void
// 		: Infer<T> | undefined

// export type LimitedReturnResponse<T extends AnyTable, R extends LimitedReturnValues> = LimitedReturnValues extends R
// 	? void
// 	: R extends 'NONE'
// 		? void
// 		: Infer<T>

// export type UpdateReturnResponse<T extends AnyTable, R extends ReturnValues> = ReturnValues extends R
// 	? void
// 	: R extends 'NONE'
// 		? void
// 		: R extends 'ALL_NEW'
// 			? Infer<T> | undefined
// 			: R extends 'ALL_OLD'
// 				? Infer<T> | undefined
// 				: R extends 'UPDATED_NEW'
// 				? Partial<Infer<T>> | undefined

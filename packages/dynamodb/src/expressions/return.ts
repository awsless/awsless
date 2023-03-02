
import { AnyTableDefinition } from "../table"

export type ReturnValues = 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW'
export type ReturnResponse<T extends AnyTableDefinition, R extends ReturnValues = 'NONE'> = (
	R extends 'NONE' ? void : Partial<T['schema']['OUTPUT']>
)

// export const returnValues = (options:{ return?:ReturnValues } = {}) => {
// 	return options.return || 'NONE'
// }

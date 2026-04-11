import { EnumExpression } from '../expression/types'
import { BaseSchema } from './schema'
import { unknown } from './unknown'

type Enum = Record<string, string | number>

export type EnumSchema<T extends Enum> = BaseSchema<'N' | 'S', T[keyof T], EnumExpression<T[keyof T]>>

export function enum_<T extends Enum>(_: T): EnumSchema<T> {
	return unknown() as EnumSchema<T>
}

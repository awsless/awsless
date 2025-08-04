import { UnknownExpression } from '../expression/types'
import { AttributeType, BaseSchema } from './schema'
import { unknown, UnknownOptions } from './unknown'

export type AnySchema = BaseSchema<AttributeType, any, UnknownExpression<any>>

export const any = (opts?: UnknownOptions): AnySchema => unknown(opts)

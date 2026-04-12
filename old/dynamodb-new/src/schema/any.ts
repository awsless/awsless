import { BaseSchema, Types } from './schema'
import { unknown, UnknownOptions } from './unknown'

export const any = (opts?: UnknownOptions) => unknown(opts) as BaseSchema<Types, any, any>

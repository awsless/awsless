import { BaseSchema, Input as InferInput, Output as InferOutput } from '@awsless/validate'
import { Context as LambdaContext } from 'aws-lambda'

export type Schema = BaseSchema | undefined
export type Input<T extends Schema = undefined> = T extends undefined ? unknown : InferInput<RemoveUndefined<T>>
export type Output<T extends Schema = undefined> = T extends undefined ? unknown : InferOutput<RemoveUndefined<T>>

export type RemoveUndefined<T> = T extends undefined ? never : T

export type Context = LambdaContext & {
	readonly event: unknown
	readonly log: Logger
}

export type Handler<S extends Schema = undefined, R = unknown> = (event: Output<S>, context: Context) => R

export type Logger = (error: Error, metaData?: ExtraMetaData) => Promise<void>
export type Loggers = Array<Logger | Loggers> | Logger
export type ExtraMetaData = Record<string, unknown | Record<string, unknown>>

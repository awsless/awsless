
import { Struct, Infer } from '@awsless/validate'
import { Context as LambdaContext } from 'aws-lambda'

export type OptStruct = Struct<any, unknown> | undefined
export type Input<T extends OptStruct = undefined> = T extends undefined ? unknown : Infer<RemoveUndefined<T>>
export type Output<T extends OptStruct = undefined> = T extends undefined ? unknown : Infer<RemoveUndefined<T>>
// export type Input<T extends OptStruct = undefined> = T extends Struct ? Infer<T> : unknown
// export type Output<T extends OptStruct = undefined> = T extends Struct ? Infer<T> : unknown
export type RemoveUndefined<T> = T extends undefined ? never : T

export type Context = LambdaContext & {
	readonly event: unknown
	readonly log: Logger
}

export type Response<O extends OptStruct = undefined> = Output<O> | Promise<Output<O>>

export type Handler<I extends OptStruct = undefined, O extends OptStruct = undefined> = (
	event: Input<I>,
	context: Context
) => Response<O>

export type Logger = (error: Error, metaData?: ExtraMetaData) => Promise<void>
export type Loggers = Array<Logger | Loggers> | Logger
export type ExtraMetaData = Record<string, unknown | Record<string, unknown>>

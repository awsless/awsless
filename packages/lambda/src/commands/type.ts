import { LambdaClient } from '@aws-sdk/client-lambda'
import { Context } from 'aws-lambda'
import { AsyncReturnType } from 'type-fest'

export type InvokeOptions = {
	client?: LambdaClient
	type?: 'RequestResponse' | 'Event' | 'DryRun'
	name: string
	qualifier?: string
	payload?: unknown
	reflectViewableErrors?: boolean
}

export type UnknownInvokeOptions = InvokeOptions & {
	payload?: unknown
}

// export type KnownInvokeOptions<Lambda extends LambdaFunction> = InvokeOptions & {
// 	payload: Parameters<Lambda>[0]
// }

export type KnownInvokeOptions<Lambda extends LambdaFunction> = unknown extends Parameters<Lambda>[0]
	? InvokeOptions & {
			payload?: unknown
		}
	: InvokeOptions & {
			payload: Parameters<Lambda>[0]
		}

// type InvokeResponseType<T> = unknown extends T
// 	? unknown
// 	: void extends T
// 		? void
// 		: T extends undefined
// 			? Jsonify<T> | undefined
// 			: Jsonify<T>

// export type InvokeResponse<Lambda extends LambdaFunction> = Promise<
// 	// AsyncReturnType<Lambda> extends undefined
// 	// 	? Jsonify<AsyncReturnType<Lambda>> | undefined
// 	// 	: Jsonify<AsyncReturnType<Lambda>>
// 	InvokeResponseType<AsyncReturnType<Lambda>>
// >

export type InvokeResponse<Lambda extends LambdaFunction> = Promise<AsyncReturnType<Lambda>>

export interface LambdaError extends Error {
	name: string
	message: string
	response?: ErrorResponse
	metadata?: { service: string }
}

export interface ErrorResponse {
	errorType: string
	errorMessage: string
}

type LambdaFunction = (event?: any, context?: Context) => Promise<unknown>

// export type Invoke = {
// 	({ client, name, qualifier, type, payload, reflectViewableErrors }: UnknownInvokeOptions): Promise<unknown>
// 	<Lambda extends LambdaFunction>({
// 		client,
// 		name,
// 		qualifier,
// 		type,
// 		payload,
// 		reflectViewableErrors,
// 	}: KnownInvokeOptions<Lambda>): InvokeResponse<Lambda>
// }

export type Invoke = {
	({ client, name, qualifier, type, payload, reflectViewableErrors }: UnknownInvokeOptions): Promise<unknown>
	<Lambda extends LambdaFunction>({
		client,
		name,
		qualifier,
		type,
		payload,
		reflectViewableErrors,
	}: KnownInvokeOptions<Lambda>): InvokeResponse<Lambda>
}

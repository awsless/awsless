
import { LambdaClient } from '@aws-sdk/client-lambda'
import { Context } from 'aws-lambda'
import { Jsonify, AsyncReturnType } from 'type-fest'

export interface InvokeOptions {
	client?: LambdaClient
	type?: 'RequestResponse' | 'Event' | 'DryRun'
	name: string
	qualifier?: string
	payload?: unknown
	reflectViewableErrors?: boolean
}

export interface UnknownInvokeOptions extends InvokeOptions {
	payload?: unknown
}

export interface KnownInvokeOptions<Lambda extends LambdaFunction> extends InvokeOptions {
	payload: Parameters<Lambda>[0]
}

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

type LambdaFunction = (event:unknown, context?:Context) => Promise<unknown>

export type Invoke = {
	({ client, name, qualifier, type, payload, reflectViewableErrors }: UnknownInvokeOptions): Promise<unknown>
	<Lambda extends LambdaFunction>({ client, name, qualifier, type, payload, reflectViewableErrors }: KnownInvokeOptions<Lambda>): Promise<Jsonify<AsyncReturnType<Lambda>>>
}

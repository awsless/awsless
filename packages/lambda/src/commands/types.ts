
import { LambdaClient } from '@aws-sdk/client-lambda'
import { Jsonify, AsyncReturnType } from 'type-fest'
import { LambdaFunction } from '../lambda'
import { OptStruct } from '../types'

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

export interface KnownInvokeOptions<Lambda extends LambdaFunction<OptStruct, OptStruct>> extends InvokeOptions {
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

export type Invoke = {
	({ client, name, qualifier, type, payload, reflectViewableErrors }: UnknownInvokeOptions): Promise<unknown>
	<Lambda extends LambdaFunction<OptStruct, OptStruct>>({ client, name, qualifier, type, payload, reflectViewableErrors }: KnownInvokeOptions<Lambda>): Promise<Jsonify<AsyncReturnType<Lambda>>>
}

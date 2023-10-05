
import { invoke, InvokeOptions } from "@awsless/lambda"
import { getLocalResourceName } from './resource.js'
import { createProxy } from './util.js'

export const getFunctionName = <S extends string, N extends string>(stack: S, name: N) => {
	return getLocalResourceName(name, stack)
}

export interface FunctionResources {}

export const Function:FunctionResources = createProxy((stackName) => {
	return createProxy((funcName) => {
		const name = getFunctionName(stackName, funcName)
		const call = (payload:unknown, options:Omit<InvokeOptions, 'payload' | 'name'> = {}) => {
			return invoke({
				...options,
				name,
				payload,
			})
		}

		call.name = name
		call.async = (payload:unknown, options:Omit<InvokeOptions, 'payload' | 'name' | 'type'> = {}) => {
			return invoke({
				...options,
				type: 'Event',
				name,
				payload,
			})
		}

		return call
	})
})

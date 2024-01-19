import { Arg } from './argument'

export type Request = {
	[field: string]: boolean | number | Request | Arg | unknown
}

type Variable = {
	name: string
	type: string
	value: unknown
}

type Context = {
	count: number
	vars: Variable[]
}

const parseArgs = (args: Request, ctx: Context): string => {
	const argEntries = Object.entries(args).filter(([_, value]) => typeof value !== 'undefined')

	if (argEntries.length === 0) {
		return ''
	}

	return argEntries
		.map(([name, value]) => {
			if (value instanceof Arg) {
				const varName = `v${++ctx.count}`
				ctx.vars.push({
					name: varName,
					type: value.type,
					value: value.value,
				})
				return `${name}:$${varName}`
			}

			// Maybe this is a bad idea.
			if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
				return `${name}:{${parseArgs(value as Request, ctx)}}`
			}

			return `${name}:${JSON.stringify(value)}`
		})
		.join(',')
}

const excludedFields = ['__name', '__args']
const parseRequest = (request: Request, ctx: Context): string => {
	if (typeof request === 'object') {
		// Maybe this is a bad idea.
		let args = ''
		if (typeof request.__args === 'object') {
			const argsString = parseArgs(request.__args as Request, ctx)
			args = argsString ? `(${argsString})` : ''
		}

		const fieldNames = Object.keys(request)
			.filter(f => !excludedFields.includes(f))
			.filter(f => Boolean(request[f]))

		if (fieldNames.length === 0) {
			return args
		}

		const fieldsSelection = fieldNames.map(f => `${f}${parseRequest(request[f] as Request, ctx)}`).join(',')

		return `${args}{${fieldsSelection}}`
	}

	return ''
}

export type Operation = 'query' | 'mutation' | 'subscription'

export function createQuery(operation: Operation, request: Request) {
	const context: Context = { count: 0, vars: [] }
	const result = parseRequest(request, context)
	const operationName = request.__name || ''
	const variables: Record<string, unknown> = {}
	const varsString =
		context.count > 0
			? `(${context.vars.map(arg => {
					variables[arg.name] = arg.value
					return `$${arg.name}:${arg.type}`
			  })})`
			: ''

	return {
		query: `${operation} ${operationName}${varsString}${result}`,
		variables,
	}
}

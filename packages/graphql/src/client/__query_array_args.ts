import { Arg } from './argument'

type Args = {
	[arg: string]: Arg | unknown
}

type Fields = {
	[field: string]: Request
}

type Request = string | boolean | number | Fields | [Args, Fields?]

type Variable = {
	name: string
	type: string
	value: unknown
}

type Context = {
	count: number
	vars: Variable[]
}

const parseRequest = (request: Request | undefined, ctx: Context): string => {
	if (Array.isArray(request)) {
		const [args, fields] = request
		const argEntries = Object.entries(args)
			// Filter out undefined args
			.filter(([_, value]) => typeof value !== 'undefined')

		if (argEntries.length === 0) {
			return parseRequest(fields, ctx)
		}

		return `(${argEntries.map(([name, value]) => {
			if (value instanceof Arg) {
				const varName = `v${++ctx.count}`
				ctx.vars.push({
					name: varName,
					type: value.type,
					value: value.value,
				})
				return `${name}:$${varName}`
			}

			return `${name}:${JSON.stringify(value)}`
		})})${parseRequest(fields, ctx)}`
	} else if (typeof request === 'object') {
		const fieldNames = Object.keys(request)
			.filter(f => '__name' !== f)
			.filter(k => Boolean(request[k]))

		if (fieldNames.length === 0) {
			throw new TypeError('Query field selection should not be empty')
		}

		return `{${fieldNames.map(f => `${f}${parseRequest(request[f], ctx)}`).join(',')}}`
	}

	return ''
}

export type Operation = 'query' | 'mutation' | 'subscription'

export function createQuery(operation: Operation, request: Fields) {
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

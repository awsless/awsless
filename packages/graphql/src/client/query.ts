import { Arg } from './argument'
// import { GraphQLSchema, RootSchema } from './client'

export type Args = {
	[arg: string]: Arg | unknown
}

export type Fields = {
	[field: string]: Request
}

export type Request = string | boolean | number | Fields | [Args, Fields?]

type Variable = {
	name: string
	type: string
	value: unknown
}

type Context = {
	count: number
	vars: Variable[]
}

// export type GraphqlOperation = {
// 	query: string
// 	variables: { [name: string]: any }
// }

// const parseInput = (value: unknown): string => {
// 	switch (typeof value) {
// 		case 'object':
// 		case 'number':
// 		case 'boolean':
// 		case 'undefined':
// 		case 'string':
// 			return JSON.stringify(value)
// 	}

// 	return ''
// }

const parseRequest = (request: Request | undefined, context: Context, path: string[]): string => {
	if (Array.isArray(request)) {
		const [args, fields] = request
		const argEntries = Object.entries(args)
			// Filter out undefined args
			.filter(([_, value]) => typeof value !== 'undefined')

		if (argEntries.length === 0) {
			return parseRequest(fields, context, path)
		}

		return `(${argEntries.map(([name, value]) => {
			if (value instanceof Arg) {
				const varName = `v${++context.count}`
				context.vars.push({
					name: varName,
					type: value.type,
					value: value.value,
				})
				return `${name}:$${varName}`
			}

			return `${name}:${JSON.stringify(value)}`
		})})${parseRequest(fields, context, path)}`
	} else if (typeof request === 'object') {
		const fields = request
		const fieldNames = Object.keys(fields).filter(k => Boolean(fields[k]))

		if (fieldNames.length === 0) {
			// TODO if fields are empty just return?
			throw new Error('field selection should not be empty')
		}

		const fieldsSelection = fieldNames
			.filter(f => !['__name'].includes(f))
			.map(f => `${f}${parseRequest(fields[f], context, [...path, f])}`)
			.join(',')

		return `{${fieldsSelection}}`
	}

	return ''
}

export type Operation = 'query' | 'mutation' | 'subscription'

// export class Query<R extends Fields = Fields> {
// 	private cache?: string

// 	constructor(readonly operation: Operation, readonly request: R) {}

// 	toString() {
// 		if (!this.cache) {
// 			const vars: Arg[] = []
// 			const result = parseRequest(this.request, vars, [])
// 			const operationName = this.request.__name || ''
// 			const varsString = vars.length > 0 ? `(${vars.map(arg => `$${arg.name}:${arg.type}`)})` : ''

// 			return `${this.operation} ${operationName}${varsString}${result}`
// 		}

// 		return this.cache
// 	}
// }

// export function createQuery<S extends RootSchema>(operation: Operation, request: S['request']) {
// 	return new Query(operation, request)
// }

// export type QueryString<O = Operation, R = Fields> = {
// 	operation: O
// 	request: R
// }

export function createQuery(operation: Operation, request: Fields) {
	const context: Context = { count: 0, vars: [] }
	const result = parseRequest(request, context, [])
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

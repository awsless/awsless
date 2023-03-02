
import { Table } from '../src/table.js'
import { IDGenerator, IDGeneratorFactory, ReturnValues } from './__types.js'

type ExpressionAttributes = {
	ExpressionAttributeNames?: object
	ExpressionAttributeValues?: object
}

type NameType = 'Names' | 'Values'
type NameProp = 'ExpressionAttributeNames' | 'ExpressionAttributeValues'

export const addExpressionNames = (input: ExpressionAttributes, attributes:() => ExpressionAttributes) => {
	addExpression('Names', input, attributes)
}

export const addExpressionValues = (input: ExpressionAttributes, attributes:() => ExpressionAttributes) => {
	addExpression('Values', input, attributes)
}

export const addExpression = (type: NameType, input: ExpressionAttributes, attributes:() => ExpressionAttributes) => {
	const key = `ExpressionAttribute${type}` as NameProp
	const exp = { ...(input[key] || {}), ...attributes() }

	if(Object.keys(exp).length) {
		input[key] = exp
	}
}

// export const addExpression = (command: ExpressionAttributes, expression:Expression) => {
// 	const names = { ...(command.ExpressionAttributeNames || {}), ...expression.names }
// 	const values = { ...(command.ExpressionAttributeValues || {}), ...expression.values }

// 	if(Object.keys(names).length) {
// 		command.ExpressionAttributeNames = names
// 	}

// 	if(Object.keys(values).length) {
// 		command.ExpressionAttributeValues = values
// 	}
// }

export const addReturnValues = (input:{ ReturnValues?:string }, options:{ return?:ReturnValues }) => {
	if(options.return) {
		input.ReturnValues = options.return
	}
}

// export const addConditionExpression = <E extends ExpressionBuilder, T extends Table<Item, keyof Item, keyof Item>>(
// 	input:ExpressionAttributes & { ConditionExpression?:string },
// 	options:{ condition?: E },
// 	gen:IDGenerator,
// 	table:T
// ) => {
// 	if(options.condition) {
// 		const exp = options.condition(gen, table)
// 		input.ConditionExpression = exp.query
// 		addExpression(input, exp)
// 	}
// }

// export const addProjectionExpression = (
// 	input:ExpressionAttributes & { ProjectionExpression?:string },
// 	options:{ projection?: ExpressionBuilder },
// 	gen:IDGenerator,
// 	table:Table<Item, keyof Item, keyof Item>
// ) => {
// 	if(options.projection) {
// 		const exp = options.projection(gen, table)
// 		input.ProjectionExpression = exp.query
// 		addExpression(input, exp)
// 	}
// }

// export const combineExpression = <T extends Expression[]>(separator:string, ...expressions:T): Expression<> => {
// 	const names:ExpressionNames = {}
// 	const values:ExpressionValues = {}
// 	const query: string = expressions.map((expression) => {
// 		Object.assign(names, expression.names)
// 		Object.assign(values, expression.values)
// 		return expression.query
// 	}).join(separator)

// 	return { query, names, values }
// }

// export const combineExpression = <L extends Expression, R extends Expression>(separator:string, left:L, right:R): Expression<L['names'] | R['names'], L['values'] | R['values']> => {
// 	return {
// 		query: [ left.query, right.query ].join(separator),
// 		names: { ...left.names, ...right.names },
// 		values: { ...left.values, ...right.values },
// 	}
// }

// export const fn = <T extends ExpressionBuilder>(name:ConditionFunctionName, exp:T) => {
// 	return (gen:IDGenerator, table:Table<Item, keyof Item>): Expression<
// 		ReturnType<T>['names'],
// 		ReturnType<T>['values']
// 	> => {
// 		const expression = exp(gen, table)

// 		return {
// 			...expression,
// 			query: `${name}(${expression.query})`,
// 		}
// 	}
// }

// export const merge = <L, R>(left:L, right:R) => {
// 	return { ...left, ...right }
// }

// export const combine = <L extends ExpressionBuilder, R extends ExpressionBuilder>(left:L, separator:string, right:R) => {
// 	return <T extends Table<Item, keyof Item, keyof Item>>(gen:IDGenerator, table:T): Expression<
// 		ReturnType<L>['names'] & ReturnType<R>['names'],
// 		ReturnType<L>['values'] & ReturnType<R>['values']
// 	> => {
// 		const l = left(gen, table)
// 		const r = right(gen, table)

// 		return {
// 			query: `${l.query} ${separator} ${r.query}`,
// 			names: merge(l.names, r.names),
// 			values: merge(l.values, r.values),
// 		}
// 	}
// }

export const generator:IDGeneratorFactory = (prefix) => {
	let id = 0
	const cache = new Map<string, number>()
	return [
		(key) => {
			if(!cache.has(key)) {
				cache.set(key, ++id)
			}

			return `${prefix}${cache.get(key)}`
		},
		() => {
			const list:Record<string, string> = {}
			for(const [ key, id ] of cache) {
				list[`${prefix}${id}`] = key
			}
			return list
		}
	]
}

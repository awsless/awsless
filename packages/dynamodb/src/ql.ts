
import { Expression, ExpressionBuilder, ExpressionNames, ExpressionValues, IDGenerator, Value } from './types.js'

export const ql = (literals:TemplateStringsArray, ...raw:Value[]): ExpressionBuilder => {
	return (gen: IDGenerator): Expression => {
		const names:ExpressionNames = {}
		const values:ExpressionValues = {}
		const string:string[] = []

		literals.forEach((literal, i) => {
			string.push(literal)

			if(i in raw) {
				const key = `:v${gen()}`
				const value = raw[i]
				string.push(key)
				values[key] = value
			}
		})

		const query = string
			.join('')
			.replace(/[\r\n]/gm, '')
			.replace(/#([a-z0-9]+)/ig, (_, name:string) => {
				const key = `#n${gen()}`
				names[key] = name
				return key
			})

		return { query, names, values }
	}
}

// export const setExpression = (records: Record<string, Value>): Expression => {
// 	const names:ExpressionNames = {}
// 	const values:ExpressionValues = {}
// 	const expression: string = 'SET ' + Object.entries(records).map(([ name, value ]) => {
// 		names[`#${ name }`] = name
// 		values[`:${ name }`] = value
// 		return `#${ name } = :${ name }`
// 	}).join(', ')

// 	return { expression, names, values }
// }

// export const joinExpression = (...expressions:Expression[]): Expression => {
// 	const names:ExpressionNames = {}
// 	const values:ExpressionValues = {}
// 	const expression: string = expressions.map((expression) => {
// 		Object.assign(names, expression.names)
// 		Object.assign(values, expression.values)
// 		return expression.expression
// 	}).join(' ')

// 	return { expression, names, values }
// }

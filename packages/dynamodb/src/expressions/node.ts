
import { Expression, ExpressionNames, ExpressionPaths, ExpressionValues, IDGenerator, NameExpression, Path, Value, ValueExpression } from "../types";

export const name = <T extends Path[]>(...path:T) => {
	return (gen:IDGenerator): NameExpression<Record<string, Exclude<T[number], number>>, ExpressionValues> => {
		const names:Record<string, Exclude<T[number], number>> = {}
		const query = []

		for(const name of path) {
			if(typeof name === 'number') {
				query.push(`[${name}]`)
				continue
			}

			const key = `#n${gen()}`
			names[key] = name as Exclude<T[number], number>

			query.push(query.length ? `.${key}` : key)
		}

		return {
			query: query.join(''),
			names,
			values: {},
			path,
		}
	}
}

export const value = <T extends Value>(value:T) => {
	return (gen:IDGenerator): ValueExpression<ExpressionNames, Record<string, T>> => {
		const key = `:v${gen()}`
		return {
			query: key,
			names: {},
			values: { [key]: value },
			value: value,
		}
	}
}

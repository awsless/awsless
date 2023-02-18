
import { Table } from "../table";
import { BaseTable, ExpressionNames, IDGenerator, Item, Path, Value, ValueExpression } from "../types";
import { Object } from 'ts-toolbelt'

// class Name<T extends Table<Item, keyof Item>> {
// 	declared const lol:T['paths']
// 	constructor(readonly table:T, path:Path[]) {

// 	}
// }

class NameExpression<T extends Value> {
	declare type: T
	readonly values = {}

	constructor(readonly query:string, readonly names:ExpressionNames) {

	}
}

export const name = <P extends Path[]>(...path:P) => {
	return <T extends BaseTable>(gen:IDGenerator, _:T) => {
		const names:Record<string, Extract<string, P[number]>> = {}
		const query = []

		for(const name of path) {
			if(typeof name === 'number') {
				query.push(`[${name}]`)
				continue
			}

			const key = `#n${gen()}`
			names[key] = name as Extract<string, P[number]>

			query.push(query.length ? `.${key}` : key)
		}

		return new NameExpression<Object.Path<T['model'], P>>(
			query.join(''),
			names
		)

		// return {
		// 	query: query.join(''),
		// 	names,
		// 	values: {},
		// 	valid: true,
		// }
	}
}

export const value = <T extends Value>(value:T) => {
	return (gen:IDGenerator): ValueExpression<T> => {
		const key = `:v${gen()}`
		return {
			query: key,
			names: {},
			values: { [key]: value },
			// value: value,
		}
	}
}

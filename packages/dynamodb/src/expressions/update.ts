import { BigFloat } from '@awsless/big-float'
import { isPath, isValue, QueryItem } from '../helper/query'
import { IDGenerator } from '../helper/id-generator'
import { AnyTableDefinition } from '../table'
import { InferPath, InferValue } from '../types/infer'

const key = Symbol()

type ChainData<T extends AnyTableDefinition> = {
	readonly set: QueryItem<T>[][]
	readonly add: QueryItem<T>[][]
	readonly rem: QueryItem<T>[][]
	readonly del: QueryItem<T>[][]
}

class Chain<T extends AnyTableDefinition> {
	[key]: ChainData<T>

	constructor(data: ChainData<T>) {
		this[key] = data
	}
}

const m = <T extends AnyTableDefinition>(
	chain: Chain<T>,
	op?: keyof ChainData<T>,
	...items: QueryItem<T>[]
): ChainData<T> => {
	const d = chain[key]
	const n = {
		set: [...d.set],
		add: [...d.add],
		rem: [...d.rem],
		del: [...d.del],
	}

	if (op && items.length) {
		n[op].push(items)
	}

	return n
}

export class UpdateExpression<T extends AnyTableDefinition> extends Chain<T> {
	/** Update a given property */
	update<P extends InferPath<T>>(...path: P) {
		return new Update<T, P>(m(this), path)
	}

	extend<R extends UpdateExpression<T> | void>(fn: (exp: UpdateExpression<T>) => R): R {
		return fn(this)
	}
}

class Update<T extends AnyTableDefinition, P extends InferPath<T>> extends Chain<T> {
	constructor(query: ChainData<T>, private path: P) {
		super(query)
	}

	private u(op: keyof ChainData<T>, ...items: QueryItem<T>[]) {
		return new UpdateExpression<T>(m(this, op, ...items))
	}

	private i(op: '+' | '-', value: number | bigint | BigFloat = 1, initialValue: number | bigint | BigFloat = 0) {
		return this.u(
			'set',
			{ p: this.path },
			'=',
			'if_not_exists(',
			{ p: this.path },
			',',
			{ v: { N: String(initialValue) } },
			')',
			op,
			{ v: { N: String(value) } }
		)
	}

	/** Set a value */
	set(value: InferValue<T, P>) {
		return this.u('set', { p: this.path }, '=', { v: value, p: this.path })
	}

	/** Set a value if the attribute doesn't already exists */
	setIfNotExists(value: InferValue<T, P>) {
		return this.u(
			'set',
			{ p: this.path },
			'=',
			'if_not_exists(',
			{ p: this.path },
			',',
			{ v: value, p: this.path },
			')'
		)
	}

	/** Set a attribute to a different but already existing attribute */
	setAttr(...path: InferPath<T>) {
		return this.u('set', { p: this.path }, '=', { p: path })
	}

	/** Delete a property */
	del() {
		return this.u('rem', { p: this.path })
	}

	/** Increment a numeric value */
	incr(value: number | bigint | BigFloat = 1, initialValue: number | bigint | BigFloat = 0) {
		return this.i('+', value, initialValue)
	}

	/** Decrement a numeric value */
	decr(value: number | bigint | BigFloat = 1, initialValue: number | bigint | BigFloat = 0) {
		return this.i('-', value, initialValue)
	}

	/** Append values to a Set */
	append(values: InferValue<T, P>) {
		return this.u('add', { p: this.path }, { v: values, p: this.path })
	}

	/** Remove values from a Set */
	remove(values: InferValue<T, P>) {
		return this.u('del', { p: this.path }, { v: values, p: this.path })
	}
}

const build = <T extends AnyTableDefinition>(items: QueryItem<T>[], gen: IDGenerator<T>) => {
	return items
		.map(item => {
			if (isValue(item)) {
				return gen.value(item.v, item.p)
			}

			if (isPath(item)) {
				return gen.path(item.p)
			}

			return item
		})
		.join(' ')
}

export const updateExpression = <T extends AnyTableDefinition>(
	options: { update: (exp: UpdateExpression<T>) => UpdateExpression<T> },
	gen: IDGenerator<T>
) => {
	const update = options.update(
		new UpdateExpression<T>({
			set: [],
			add: [],
			rem: [],
			del: [],
		})
	)

	const buildList = (name: string, list: QueryItem<T>[][]) => {
		if (list.length) {
			return [name, list.map(items => build(items, gen)).join(', ')]
		}

		return []
	}

	const data = update[key]
	const query: string = [
		...buildList('SET', data.set),
		...buildList('ADD', data.add),
		...buildList('REMOVE', data.rem),
		...buildList('DELETE', data.del),
	].join(' ')

	return query
}

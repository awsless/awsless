
import { build, Chain, chainData, ChainItems, merge as m } from "../helper/chainable"
import { IDGenerator } from "../helper/id-generator"
import { AnyTableDefinition, IndexNames } from "../table"

type PrimaryKeyNames<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined
> = (
	I extends IndexNames<T>
	? T['indexes'][I]['sort'] extends string
		? T['indexes'][I]['hash'] | T['indexes'][I]['sort']
		: T['indexes'][I]['hash']
	: T['sort'] extends string
		? T['hash'] | T['sort']
		: T['hash']
)

type InferValue<
	T extends AnyTableDefinition,
	P extends PrimaryKeyNames<T, I>,
	I extends IndexNames<T> | undefined
> = T['schema']['INPUT'][P]

export class KeyCondition<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined
> extends Chain<T> {
	where<P extends PrimaryKeyNames<T, I>>(path:P) {
		return new Where<T, P, I>(m(this), path)
	}

	extend<R extends Combine<T, I> | KeyCondition<T, I> | void>(fn:(exp:KeyCondition<T, I>) => R): R {
		return fn(this)
	}
}

class Where<
	T extends AnyTableDefinition,
	P extends PrimaryKeyNames<T, I>,
	I extends IndexNames<T> | undefined
> extends Chain<T> {
	constructor(query:ChainItems<T>, private path:P) {
		super(query)
	}

	private compare(comparator:string, v:InferValue<T, P, I>) {
		return new Combine<T, I>(m(this, '(', { p:[ this.path ] }, comparator, { v, p:[ this.path ] }, ')'))
	}

	eq(value:InferValue<T, P, I>) { return this.compare('=', value) }
	gt(value:InferValue<T, P, I>) { return this.compare('>', value) }
	gte(value:InferValue<T, P, I>) { return this.compare('>=', value) }
	lt(value:InferValue<T, P, I>) { return this.compare('<', value) }
	lte(value:InferValue<T, P, I>) { return this.compare('<=', value) }

	between(min:InferValue<T, P, I>, max:InferValue<T, P, I>) {
		return new Combine<T, I>(m(this, '(',
			{ p: [ this.path ] }, 'BETWEEN', { v: min, p: [ this.path ] }, 'AND', { v:max, p: [ this.path ] },
		')'))
	}

	beginsWith(value:InferValue<T, P, I>) {
		return new Combine<T, I>(m(this, 'begins_with(', { p: [ this.path ] }, ',', { v: value, p: [ this.path ] }, ')'))
	}
}

export class Combine<
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined
> extends Chain<T> {
	get and() {
		return new KeyCondition<T, I>(m(this, 'AND'))
	}

	get or() {
		return new KeyCondition<T, I>(m(this, 'OR'))
	}
}

export const keyConditionExpression = <
	T extends AnyTableDefinition,
	I extends IndexNames<T> | undefined = undefined
>(
	options:{
		index?: I
		keyCondition: (exp:KeyCondition<T, I>) => Combine<T, I>
	},
	gen:IDGenerator<T>,
) => {

	const condition = options.keyCondition(new KeyCondition<T, I>([]))
	const query = build(chainData(condition), gen).join(' ')

	return query
}

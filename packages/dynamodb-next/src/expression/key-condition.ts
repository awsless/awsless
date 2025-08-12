import { AnyTable, IndexNames } from '../table'
import { Fluent } from './fluent'

export type KeyConditionExpression<T extends AnyTable, I extends IndexNames<T> | undefined> = (
	e: Pick<
		T['schema'][symbol]['Expression']['Root']['Condition'],
		I extends IndexNames<T> ? T['indexes'][I]['sort'] : T['sort']
	>
) => Fluent | Fluent[]

// import { IDGenerator } from '../helper/id-generator'
// import { QueryBulder, build, flatten } from '../helper/query'
// import { AnyTable, IndexNames } from '../table'

// type PrimaryKeyNames<T extends AnyTable, I extends IndexNames<T> | undefined> =
// 	I extends IndexNames<T>
// 		? T['indexes'][I]['sort'] extends string
// 			? T['indexes'][I]['hash'] | T['indexes'][I]['sort']
// 			: T['indexes'][I]['hash']
// 		: T['sort'] extends string
// 			? T['hash'] | T['sort']
// 			: T['hash']

// type InferValue<
// 	T extends AnyTable,
// 	P extends PrimaryKeyNames<T, I>,
// 	I extends IndexNames<T> | undefined,
// > = T['schema']['INPUT'][P]

// export class KeyCondition<T extends AnyTable, I extends IndexNames<T> | undefined> extends QueryBulder<T> {
// 	where<P extends PrimaryKeyNames<T, I>>(path: P) {
// 		return new Where<T, P, I>(this, path)
// 	}

// 	extend<R extends Combine<T, I> | KeyCondition<T, I> | void>(fn: (exp: KeyCondition<T, I>) => R): R {
// 		return fn(this)
// 	}
// }

// class Where<
// 	T extends AnyTable,
// 	P extends PrimaryKeyNames<T, I>,
// 	I extends IndexNames<T> | undefined,
// > extends QueryBulder<T> {
// 	constructor(
// 		query: QueryBulder<T>,
// 		private path: P
// 	) {
// 		super(query)
// 	}

// 	private compare(comparator: string, v: InferValue<T, P, I>) {
// 		return new Combine<T, I>(this, ['(', { p: [this.path] }, comparator, { v, p: [this.path] }, ')'])
// 	}

// 	eq(value: InferValue<T, P, I>) {
// 		return this.compare('=', value)
// 	}
// 	gt(value: InferValue<T, P, I>) {
// 		return this.compare('>', value)
// 	}
// 	gte(value: InferValue<T, P, I>) {
// 		return this.compare('>=', value)
// 	}
// 	lt(value: InferValue<T, P, I>) {
// 		return this.compare('<', value)
// 	}
// 	lte(value: InferValue<T, P, I>) {
// 		return this.compare('<=', value)
// 	}

// 	between(min: InferValue<T, P, I>, max: InferValue<T, P, I>) {
// 		return new Combine<T, I>(this, [
// 			'(',
// 			{ p: [this.path] },
// 			'BETWEEN',
// 			{ v: min, p: [this.path] },
// 			'AND',
// 			{ v: max, p: [this.path] },
// 			')',
// 		])
// 	}

// 	beginsWith(value: InferValue<T, P, I>) {
// 		return new Combine<T, I>(this, ['begins_with(', { p: [this.path] }, ',', { v: value, p: [this.path] }, ')'])
// 	}
// }

// export class Combine<T extends AnyTable, I extends IndexNames<T> | undefined> extends QueryBulder<T> {
// 	get and() {
// 		return new KeyCondition<T, I>(this, ['AND'])
// 	}

// 	get or() {
// 		return new KeyCondition<T, I>(this, ['OR'])
// 	}
// }

// export const keyConditionExpression = <T extends AnyTable, I extends IndexNames<T> | undefined = undefined>(
// 	options: {
// 		index?: I
// 		keyCondition: (exp: KeyCondition<T, I>) => Combine<T, I>
// 	},
// 	gen: IDGenerator<T>
// ) => {
// 	return build(flatten(options.keyCondition(new KeyCondition<T, I>())), gen)
// }

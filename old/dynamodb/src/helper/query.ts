import { AnyTableDefinition } from '../table'
import { InferPath } from '../types/infer'
import { AttributeValue } from '../types/value'
import { IDGenerator } from './id-generator'

export type QueryValue<T extends AnyTableDefinition> = {
	v: AttributeValue
	p?: InferPath<T>
}

export type QueryPath<T extends AnyTableDefinition> = {
	p: InferPath<T>
}

const key = Symbol()

export const cursor = Symbol()

export type QueryItem<T extends AnyTableDefinition> =
	| QueryBulder<T>
	| QueryValue<T>
	| QueryPath<T>
	| typeof cursor
	| string

export const isValue = <T extends AnyTableDefinition>(item: QueryItem<T>): item is QueryValue<T> => {
	return typeof (item as QueryValue<T>).v !== 'undefined'
}

export const isPath = <T extends AnyTableDefinition>(item: QueryItem<T>): item is QueryPath<T> => {
	return typeof (item as QueryPath<T>).p !== 'undefined'
}

export const flatten = <T extends AnyTableDefinition>(builder: QueryBulder<T>) => {
	let current: QueryBulder<T> = builder

	while (true) {
		const data = current[key]

		if (data.parent) {
			const parent = data.parent[key]

			const found = parent.items.findIndex(item => item === cursor)
			const index = found >= 0 ? found : parent.items.length

			parent.items = [...parent.items.slice(0, index), ...data.items, ...parent.items.slice(index + 1)]

			current = data.parent
		} else {
			break
		}
	}

	return current
}

export const build = <T extends AnyTableDefinition>(builder: QueryBulder<T>, gen: IDGenerator<T>): string => {
	return builder[key].items
		.filter(item => item !== cursor)
		.map(item => {
			if (item instanceof QueryBulder) {
				return build(flatten(item), gen)
			}

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

export class QueryBulder<T extends AnyTableDefinition> {
	[key]: {
		parent: QueryBulder<T> | undefined
		items: QueryItem<T>[]
	}

	constructor(parent: QueryBulder<T> | undefined = undefined, items: QueryItem<T>[] = []) {
		this[key] = {
			parent,
			items,
		}
	}
}

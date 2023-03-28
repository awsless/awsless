import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { IDGenerator } from "./id-generator";
import { AnyTableDefinition } from "../table";
import { InferPath } from "../types/infer";

export type ChainValue<T extends AnyTableDefinition> = {
	v: AttributeValue
	p?: InferPath<T>
}

export type ChainPath<T extends AnyTableDefinition> = {
	p: InferPath<T>
}

const key = Symbol()

export type ChainItem<T extends AnyTableDefinition> = ChainValue<T> | ChainPath<T> | string
export type ChainItems<T extends AnyTableDefinition> = Array<ChainItem<T>>

export class Chain<T extends AnyTableDefinition> {
	[key]: ChainItems<T>

	constructor(query:ChainItems<T>) {
		this[key] = query
	}
}

const isValue = <T extends AnyTableDefinition>(item:ChainItem<T>): item is ChainValue<T> => {
	return typeof (item as ChainValue<T>).v !== 'undefined'
}

const isPath = <T extends AnyTableDefinition>(item:ChainItem<T>): item is ChainPath<T> => {
	return typeof (item as ChainPath<T>).p !== 'undefined'
}

export const merge = <T extends AnyTableDefinition>(chain:Chain<T>, ...items:ChainItems<T>) => {
	return [
		...chain[key],
		...items
	]
}

export const build = <T extends AnyTableDefinition>(items: ChainItems<T>, gen:IDGenerator<T>) => {
	return items.map(item => {
		if(isValue(item)) {
			return gen.value(item.v, item.p)
		}

		if(isPath(item)) {
			return gen.path(item.p)
		}

		return item
	})
}

export const chainData = <T extends AnyTableDefinition>(chain:Chain<T>) => {
	return chain[key]
}

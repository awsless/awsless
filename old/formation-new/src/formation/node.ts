import { DataSource } from './data-source.ts'
import type { Config, Meta, State, Tag } from './meta.ts'
import { Resource } from './resource.ts'

export type Node<T extends Tag = Tag, I extends State = State, O extends State = State, C extends Config = Config> = {
	$: Meta<T, I, O, C>
} & O

export const isNode = (obj: object): obj is { $: { tag: string } } => {
	return '$' in obj && typeof obj.$ === 'object' && obj.$ !== null && 'tag' in obj.$ && typeof obj.$.tag === 'string'
}

export const isResource = (obj: object): obj is Resource => {
	return isNode(obj) && obj.$.tag === 'resource'
}

export const isDataSource = (obj: object): obj is DataSource => {
	return isNode(obj) && obj.$.tag === 'data'
}

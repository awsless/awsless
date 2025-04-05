import { type DataSource } from './data-source.ts'
import { type Resource } from './resource.ts'

export const hasMeta = (obj: object): obj is { $: { tag: string } } => {
	return '$' in obj && typeof obj.$ === 'object' && obj.$ !== null && 'tag' in obj.$ && typeof obj.$.tag === 'string'
}

export const isResource = (obj: object): obj is Resource => {
	return hasMeta(obj) && obj.$.tag === 'resource'
}

export const isDataSource = (obj: object): obj is DataSource => {
	return hasMeta(obj) && obj.$.tag === 'data-source'
}

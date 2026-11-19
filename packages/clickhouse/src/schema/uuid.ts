import { Schema } from './schema'

export type UUID = `${string}-${string}-${string}-${string}-${string}`

export const uuid = () =>
	new Schema<string, UUID, UUID>(
		value => value,
		value => value as UUID,
		'UUID'
	)

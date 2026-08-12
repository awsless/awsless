import { Group } from './group.ts'
import { Output } from './output.ts'
import { createUrn, State, URN } from './resource.ts'
import { findParentStack, Stack } from './stack.ts'

export type DataSourceMeta<O extends State = State, T extends string = string> = {
	readonly tag: 'data-source'
	readonly urn: URN
	readonly logicalId: string
	readonly physicalId: string
	readonly stack: Stack
	readonly type: T
	readonly provider: string

	readonly resolve: (data: O) => void
	readonly output: <O>(cb: (data: State) => O) => Output<O>
}

export type DataSource<O extends State = State, T extends string = string> = O & {
	readonly $: DataSourceMeta<O, T>
}

export const createDataSourceMeta = <O extends State = State, T extends string = string>(
	provider: string,
	parent: Group,
	type: T,
	logicalId: string,
	physicalId: string
): DataSourceMeta<O, T> => {
	const urn = createUrn(type, logicalId, parent.urn)
	const stack = findParentStack(parent)

	let output: O | undefined

	return {
		tag: 'data-source',
		urn,
		logicalId,
		physicalId,
		type,
		stack,
		provider,
		resolve(data) {
			output = data
		},
		output<V>(cb: (data: State) => V) {
			return new Output<V>(new Set([this as DataSourceMeta]), resolve => {
				if (!output) {
					throw new Error(`Unresolved output for data-source: ${type} ${id}`)
				}

				resolve(cb(output))
			})
		},
	}
}

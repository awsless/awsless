import { randomUUID } from 'node:crypto'
import { findInputDeps } from './input.ts'
import { Output } from './output.ts'
import { State, URN } from './resource.ts'

export type DataSourceMeta<I extends State = State, T extends string = string> = {
	readonly tag: 'data-source'
	readonly urn: URN
	readonly type: T
	readonly input: I
	readonly provider: string
	readonly dependencies: Set<URN>

	readonly resolve: (data: State) => void
	readonly output: <O>(cb: (data: State) => O) => Output<O>
}

export type DataSource<I extends State = State, O extends State = State, T extends string = string> = O & {
	readonly $: DataSourceMeta<I, T>
}

export type DataSourceConfig = {
	/** Pass an ID of an explicitly configured provider, instead of using the default provider. */
	provider?: string
}

export const createDataSourceMeta = <I extends State = State, T extends string = string>(
	provider: string,
	type: T,
	input: I
): DataSourceMeta<I, T> => {
	let output: State | undefined

	const dependencies = new Set(findInputDeps(input).map(dep => dep.urn))

	return {
		tag: 'data-source',
		urn: `urn:data:${type}:${randomUUID()}`,
		type,
		input,
		provider,
		dependencies,
		resolve(v) {
			output = v
		},
		output<V>(cb: (data: State) => V) {
			return new Output<V>(new Set([this]), (resolve, reject) => {
				if (!output) {
					reject(new Error(`Unresolved output for data-source: ${type}`))
				} else {
					resolve(cb(output))
				}
			})
		},
	}
}

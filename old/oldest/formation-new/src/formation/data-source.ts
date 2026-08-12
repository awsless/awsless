// import { randomUUID } from 'node:crypto'
// import { findInputDeps } from './input.ts'
// import { findInputDeps } from './input.ts'
import { Group } from './group.ts'
import { Config, Meta, State } from './meta.ts'
// import { Output } from './output.ts'

export type DataSourceMeta<I extends State = State, O extends State = State> = Meta<'data', I, O>

export type DataSource<I extends State = State, O extends State = State> = {
	readonly $: DataSourceMeta<I, O>
} & O

export type DataSourceFunction<I extends State = State, O extends State = State> = (
	parent: Group,
	id: string,
	input: I,
	config?: Config
) => DataSource<I, O>

// export const createDataSourceMeta = <I extends State = State>(
// 	provider: string,
// 	type: string,
// 	input: I
// ): DataSourceMeta<I> => {
// 	let output: State | undefined

// 	// const dependencies = new Set<URN>()
// 	const dependencies = new Set(findInputDeps(input).map(dep => dep.urn))

// 	return {
// 		tag: 'data-source',
// 		urn: `urn:data:${type}:${randomUUID()}`,
// 		type,
// 		input,
// 		provider,
// 		dependencies,
// 		resolve(v) {
// 			output = v
// 		},
// 		output<V>(cb: (data: State) => V) {
// 			return new Output<V>(new Set([this]), (resolve, reject) => {
// 				if (!output) {
// 					reject(new Error(`Unresolved output for data-source: ${type}`))
// 				} else {
// 					resolve(cb(output))
// 				}
// 			})
// 		},
// 	}
// }

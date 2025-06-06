import { DataSource, DataSourceMeta } from './data-source.ts'
import { Group } from './group.ts'
import { findInputDeps } from './input.ts'
import { isResource } from './meta.ts'
// import { findInputDeps } from './input.ts'
import { Output } from './output.ts'
import { findParentStack, Stack } from './stack.ts'

export type URN = `urn:${string}`
export type State = Record<string, any>

export type ResourceConfig = {
	/** Specify additional explicit dependencies in addition to the ones in the dependency graph. */
	dependsOn?: Resource<any, any>[]

	/** Import an existing resource instead of creating a new resource. */
	import?: string

	/** If true the resource will be retained in the backing cloud provider during a Pulumi delete operation. */
	retainOnDelete?: boolean

	/** Override the default create-after-delete behavior when replacing a resource. */
	deleteAfterCreate?: boolean

	/** Pass an ID of an explicitly configured provider, instead of using the default provider. */
	provider?: string

	/** If set, the provider’s Delete method will not be called for this resource if the specified resource is being deleted as well. */
	// deletedWith?: Resource;

	/** Declare that changes to certain properties should be treated as forcing a replacement. */
	// replaceOnChanges?: string[];

	/** Declare that changes to certain properties should be ignored during a diff. */
	// ignoreChanges?: string[];
}

export type ResourceMeta<I extends State = State, O extends State = State> = {
	readonly tag: 'resource'
	readonly urn: URN
	readonly logicalId: string
	readonly type: string
	readonly stack: Stack
	readonly provider: string
	readonly input: I
	readonly config?: ResourceConfig
	readonly dependencies: Set<URN>
	readonly dataSourceMetas: Set<DataSourceMeta>

	// readonly attach: (resource: Resource<I, O, T>) => void
	readonly attachDependencies: (props: State) => void
	readonly resolve: (data: O) => void
	readonly output: <O>(cb: (data: State) => O) => Output<O>
}

export type Resource<I extends State = State, O extends State = State> = O & {
	readonly $: ResourceMeta<I, O>
}

export type ResourceClass<I extends State = State, O extends State = State> = {
	new (parent: Group, id: string, props: I, config?: ResourceConfig): Resource<I, O>
	get(parent: Group, id: string, physicalId: string): DataSource<I, O>
}

export const createUrn = (type: string, name: string, parentUrn?: URN): URN => {
	return `${parentUrn ? parentUrn : 'urn'}:${type}:{${name}}`
}

export const createResourceMeta = <I extends State = State, O extends State = State>(
	provider: string,
	parent: Group,
	type: string,
	logicalId: string,
	input: I,
	config?: ResourceConfig
): ResourceMeta<I, O> => {
	const urn = createUrn(type, logicalId, parent.urn)
	const stack = findParentStack(parent)
	const dependencies = new Set<URN>()
	const dataSourceMetas = new Set<DataSourceMeta>()

	let output: O | undefined

	// ------------------------------------------------------------------------------
	// Link the input dependencies to our resource if they are in the same stack.
	// If the resource is coming from a different stack we will let our stack depend
	// ------------------------------------------------------------------------------

	for (const dep of findInputDeps(input)) {
		if (dep.tag === 'resource') {
			if (dep.stack.urn === stack.urn) {
				if (dep.urn === urn) {
					throw new Error("You can't depend on yourself")
				}

				dependencies.add(dep.urn)
			} else {
				stack.dependsOn(dep.stack)
			}
		} else {
			dataSourceMetas.add(dep)
		}
	}

	for (const dep of config?.dependsOn ?? []) {
		if (isResource(dep)) {
			if (dep.$.stack.urn === stack.urn) {
				dependencies.add(dep.$.urn)
			} else {
				stack.dependsOn(dep.$.stack)
			}
		}
	}

	return {
		tag: 'resource',
		urn,
		logicalId,
		type,
		stack,
		provider,
		input,
		config,
		dependencies,
		dataSourceMetas,
		// attach(value) {
		// 	resource = value
		// },
		// dependOn(...resources: Resource[]) {},
		attachDependencies(props) {
			for (const dep of findInputDeps(props)) {
				if (dep.tag === 'resource') {
					if (dep.stack.urn === stack.urn) {
						if (dep.urn === urn) {
							throw new Error("You can't depend on yourself")
						}
						dependencies.add(dep.urn)
					} else {
						stack.dependsOn(dep.stack)
					}
				} else {
					dataSourceMetas.add(dep)
				}
			}
		},
		resolve(data) {
			output = data
		},
		output<V>(cb: (data: State) => V) {
			return new Output<V>(new Set([this as ResourceMeta]), resolve => {
				if (!output) {
					throw new Error(`Unresolved output for resource: ${urn}`)
				}

				resolve(cb(output))
			})
		},
	}
}

// stack.on('deploy', workspace => {
// 	resource.deploy(workspace)
// })

// resource.on('deploy', workspace => {
// 	datasource.deploy(workspace)
// })

// dataSource.on('deploy', workspace => {
// 	datasource.deploy(workspace)
// })

import { UUID } from 'node:crypto'
import { createDebugger } from '../../debug.ts'
import { resolveInputs } from '../../input.ts'
import { Resource, URN } from '../../resource.ts'
import { ConcurrencyQueue } from '../concurrency.ts'
import { DependencyGraph } from '../dependency.ts'
import { ResourceError, StackError } from '../error.ts'
import { compareState, StackState } from '../state.ts'
import { WorkSpaceOptions } from '../workspace.ts'
import { createResource } from './create-resource.ts'
import { getDataSource } from './get-data-source.ts'
import { importResource } from './import-resource.ts'
import { updateResource } from './update-resource.ts'

const debug = createDebugger('Deploy Stack')

export const deployStackResources = async (
	stackState: StackState,
	resources: Resource[],
	// dataSources: DataSource[],
	appToken: UUID,
	queue: ConcurrencyQueue,
	opt: WorkSpaceOptions
) => {
	// -------------------------------------------------------------------
	// Heal from unknown remote state

	// Right now we can't heal from the unknown output state if the
	// resource was already been created down stream.
	// This seems to be a problem with the way a terraform provider works.

	// await this.healFromUnknownRemoteState(stackState);

	// -------------------------------------------------------------------

	debug(stackState.name, 'start')

	const graph = new DependencyGraph()

	// -------------------------------------------------------------------
	// Get data source...

	// const dataSources = new Set<DataSourceMeta>([])

	for (const resource of resources) {
		for (const dataSource of resource.$.dataSourceMetas) {
			// dataSources.add(dataSource)

			graph.add(dataSource.urn, [...dataSource.dependencies], () => {
				return queue(async () => {
					const input = await resolveInputs(dataSource.input)
					const output = await getDataSource(dataSource, input, opt)
					dataSource.resolve(output)
				})
			})
		}
	}

	// for (const dataSource of dataSources) {
	// 	dataSource.
	// 	graph.add(dataSource.$.urn, [], () => {
	// 		return queue(async () => {
	// 			const output = await getDataSource(dataSource, opt)

	// 			dataSource.$.resolve(output)
	// 		})
	// 	})
	// }

	// for (const dataSource of dataSources) {
	// 	graph.add(dataSource.$.urn, [], () => {
	// 		return queue(async () => {
	// 			const output = await getDataSource(dataSource, opt)

	// 			dataSource.$.resolve(output)
	// 		})
	// 	})
	// }

	// -------------------------------------------------------------------
	// Deploy resources...

	for (const resource of resources) {
		const dependencies: URN[] = [
			...resource.$.dependencies,
			...[...resource.$.dataSourceMetas].map(d => d.urn),
			// ...(resource.$.config?.dependsOn?.map(r => r.$.urn) ?? []),
		]

		const partialNewResourceState = {
			dependencies,
			lifecycle: {
				deleteAfterCreate: resource.$.config?.deleteAfterCreate,
				retainOnDelete: resource.$.config?.retainOnDelete,
			},
		}

		graph.add(resource.$.urn, dependencies, () => {
			return queue(async () => {
				let resourceState = stackState.resources[resource.$.urn]

				let input
				try {
					input = await resolveInputs(resource.$.input)
				} catch (error) {
					throw ResourceError.wrap(
						//
						resource.$.urn,
						resource.$.type,
						'resolve',
						error
					)
				}

				// --------------------------------------------------
				// New resource
				// --------------------------------------------------

				if (!resourceState) {
					// --------------------------------------------------
					// Import resource if needed

					if (resource.$.config?.import) {
						const importedState = await importResource(resource, input, opt)
						const newResourceState = await updateResource(
							resource,
							appToken,
							importedState.output!,
							input,
							opt
						)

						resourceState = stackState.resources[resource.$.urn] = {
							...importedState,
							...newResourceState,
							...partialNewResourceState,
						}
					} else {
						// --------------------------------------------------
						// Create resource

						const newResourceState = await createResource(resource, appToken, input, opt)

						resourceState = stackState.resources[resource.$.urn] = {
							...newResourceState,
							...partialNewResourceState,
						}
					}
				} else if (
					// --------------------------------------------------
					// Check if any state has changed
					!compareState(resourceState.input, input)
				) {
					// --------------------------------------------------
					// Update resource
					// --------------------------------------------------

					const newResourceState = await updateResource(resource, appToken, resourceState.output!, input, opt)

					Object.assign(resourceState, {
						input,
						...newResourceState,
						...partialNewResourceState,
					})
				} else {
					Object.assign(resourceState, partialNewResourceState)
				}

				// --------------------------------------------------
				// Hydrate resource

				if (resourceState.output) {
					resource.$.resolve(resourceState.output)
				}
			})
		})
	}

	const errors = await graph.run()

	debug(stackState.name, 'done')

	if (errors.length > 0) {
		throw new StackError(stackState.name, [...new Set(errors)], 'Deploying resources failed.')
	}
}

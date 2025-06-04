import { UUID } from 'node:crypto'
import { createDebugger } from '../../debug.ts'
import { resolveInputs } from '../../input.ts'
import { isDataSource, isResource, Node } from '../../node.ts'
import { URN } from '../../urn.ts'
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

export const deployStackNodes = async (
	stackState: StackState,
	nodes: Node[],
	// resources: Resource[],
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
	// Deploy resources & data-sources...

	for (const node of nodes) {
		const dependencies: URN[] = [...node.$.dependencies]

		const partialNewResourceState = {
			dependencies,
			lifecycle: isResource(node)
				? {
						deleteAfterCreate: node.$.config?.deleteAfterCreate,
						retainOnDelete: node.$.config?.retainOnDelete,
					}
				: undefined,
		}

		graph.add(node.$.urn, dependencies, () => {
			return queue(async () => {
				let nodeState = stackState.nodes[node.$.urn]

				let input
				try {
					input = await resolveInputs(node.$.input)
				} catch (error) {
					throw ResourceError.wrap(
						//
						node.$.urn,
						node.$.type,
						'resolve',
						error
					)
				}

				// --------------------------------------------------
				// Data Source
				// --------------------------------------------------

				if (isDataSource(node)) {
					if (!nodeState) {
						// NEW
						const dataSourceState = await getDataSource(node.$, input, opt)
						nodeState = stackState.nodes[node.$.urn] = {
							...dataSourceState,
							...partialNewResourceState,
						}
					} else if (!compareState(nodeState.input, input)) {
						// UPDATE
						const dataSourceState = await getDataSource(node.$, input, opt)
						Object.assign(nodeState, {
							...dataSourceState,
							...partialNewResourceState,
						})
					} else {
						Object.assign(nodeState, partialNewResourceState)
					}
				}

				// --------------------------------------------------
				// Resource
				// --------------------------------------------------

				if (isResource(node)) {
					// --------------------------------------------------
					// New resource

					if (!nodeState) {
						// --------------------------------------------------
						// Import resource if needed

						if (node.$.config?.import) {
							const importedState = await importResource(node, input, opt)
							const newResourceState = await updateResource(
								node,
								appToken,
								importedState.output,
								input,
								opt
							)

							nodeState = stackState.nodes[node.$.urn] = {
								...importedState,
								...newResourceState,
								...partialNewResourceState,
							}
						} else {
							// --------------------------------------------------
							// Create resource

							const newResourceState = await createResource(node, appToken, input, opt)

							nodeState = stackState.nodes[node.$.urn] = {
								...newResourceState,
								...partialNewResourceState,
							}
						}
					} else if (
						// --------------------------------------------------
						// Check if any state has changed
						!compareState(nodeState.input, input)
					) {
						// --------------------------------------------------
						// Update resource

						const newResourceState = await updateResource(node, appToken, nodeState.output!, input, opt)

						Object.assign(nodeState, {
							input,
							...newResourceState,
							...partialNewResourceState,
						})
					} else {
						Object.assign(nodeState, partialNewResourceState)
					}
				}

				// --------------------------------------------------
				// Hydrate node

				if (nodeState?.output) {
					node.$.resolve(nodeState.output)
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

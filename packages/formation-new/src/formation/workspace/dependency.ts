// import { run, Step } from 'promise-dag'
import { DirectedGraph } from 'graphology'
import { topologicalGenerations, willCreateCycle } from 'graphology-dag'
import { URN } from '../urn.ts'
import { entries } from './entries.ts'

// export class DependencyGraph {
// 	private graph: Record<URN, Step[]> = {}

// 	add(urn: URN, deps: URN[], callback: () => Promise<void>) {
// 		this.graph[urn] = [...deps, callback]
// 	}

// 	run() {
// 		return Promise.allSettled(Object.values(run(this.graph)))
// 	}
// }

export class DependencyGraph {
	private graph = new DirectedGraph()
	private callbacks = new Map<URN, () => Promise<void>>()

	add(urn: URN, deps: URN[], callback: () => Promise<void>) {
		this.callbacks.set(urn, callback)

		this.graph.mergeNode(urn)

		for (const dep of deps) {
			if (willCreateCycle(this.graph, dep, urn)) {
				throw new Error(`There is a circular dependency between ${urn} -> ${dep}`)
			}

			this.graph.mergeEdge(dep, urn)
		}
	}

	validate() {
		const nodes = this.graph.nodes() as URN[]

		for (const urn of nodes) {
			if (!this.callbacks.has(urn)) {
				const deps = this.graph.filterNodes(node => {
					return this.graph.areNeighbors(node, urn)
				})

				throw new Error(`The following resources ${deps.join(', ')} have a missing dependency: ${urn}`)
			}
		}
	}

	async run() {
		// this.validate()

		const graph = topologicalGenerations(this.graph) as URN[][]
		const errors: Error[] = []

		for (const list of graph) {
			const result = await Promise.allSettled(
				list.map(urn => {
					const callback = this.callbacks.get(urn)

					if (!callback) {
						return
					}

					return callback()
				})
			)

			for (const entry of result) {
				if (entry.status === 'rejected') {
					if (entry.reason instanceof Error) {
						errors.push(entry.reason)
					} else {
						errors.push(new Error(`Unknown error: ${entry.reason}`))
					}
				}
			}

			if (errors.length > 0) {
				break
			}
		}

		return errors

		// return Promise.allSettled(Object.values(run(this.graph)))
	}
}

export const dependentsOn = (resources: Record<URN, { dependencies: URN[] }>, dependency: URN) => {
	const dependents: URN[] = []

	for (const [urn, resource] of entries(resources)) {
		if (resource.dependencies.includes(dependency)) {
			dependents.push(urn)
		}
	}

	return dependents
}

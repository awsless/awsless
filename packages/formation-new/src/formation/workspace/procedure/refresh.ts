import { App } from '../../app.ts'
import { findProvider } from '../../provider.ts'
import { concurrencyQueue } from '../concurrency.ts'
import { compareState } from '../state.ts'
import { WorkSpaceOptions } from '../workspace.ts'

export const refresh = async (app: App, opt: WorkSpaceOptions) => {
	const appState = await opt.backend.state.get(app.urn)
	const queue = concurrencyQueue(opt.concurrency ?? 10)

	if (appState) {
		await Promise.all(
			Object.values(appState.stacks).map(stackState => {
				return Promise.all(
					Object.values(stackState.nodes).map(nodeState => {
						return queue(async () => {
							const provider = findProvider(opt.providers, nodeState.provider)

							if (nodeState.tag === 'data') {
								const result = await provider.getData?.({
									type: nodeState.type,
									state: nodeState.output,
								})

								if (result && !compareState(result.state, nodeState.output)) {
									nodeState.output = result.state
									nodeState.input = result.state
								}
							} else if (nodeState.tag === 'resource') {
								const result = await provider.getResource({
									type: nodeState.type,
									state: nodeState.output,
								})

								if (result && !compareState(result.state, nodeState.output)) {
									nodeState.output = result.state
									nodeState.input = result.state
								}
							}
						})
					})
				)
			})
		)

		await opt.backend.state.update(app.urn, appState)
	}
}

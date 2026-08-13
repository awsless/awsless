import { App } from '../../app.ts'
import { WorkSpaceOptions } from '../workspace.ts'

export const hydrate = async (app: App, opt: WorkSpaceOptions) => {
	const appState = await opt.backend.state.get(app.urn)

	if (appState) {
		for (const stack of app.stacks) {
			const stackState = appState.stacks[stack.urn]

			if (stackState) {
				for (const node of stack.nodes) {
					const nodeState = stackState.nodes[node.$.urn]

					if (nodeState && nodeState.output) {
						node.$.resolve(nodeState.output)
					}
				}
			}
		}
	}
}

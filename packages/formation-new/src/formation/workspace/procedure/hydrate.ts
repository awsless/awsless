import { App } from '../../app.ts'
import { WorkSpaceOptions } from '../workspace.ts'

export const hydrate = async (app: App, opt: WorkSpaceOptions) => {
	const appState = await opt.backend.state.get(app.urn)

	if (appState) {
		for (const stack of app.stacks) {
			const stackState = appState.stacks[stack.urn]

			if (stackState) {
				for (const resource of stack.resources) {
					const resourceState = stackState.resources[resource.$.urn]

					if (resourceState && resourceState.output) {
						resource.$.resolve(resourceState.output)
					}
				}
			}
		}
	}
}

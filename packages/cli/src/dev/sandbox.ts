import { kebabCase } from 'change-case'
import { StackConfig } from '../config/stack.js'

// The header a sandboxed function's AWS calls carry to the local emulators.
export const SANDBOX_HEADER = 'x-awsless-sandbox'

export type DevSandbox = {
	routes: string[]
	configs: string[]
	services: string[]
}

const formatRoute = (stack: string, type: string, name: string) => {
	return [stack, type, name].map(part => kebabCase(part)).join(':')
}

// What every sandboxed function may reach, by its route. Deployed, IAM and
// the sandbox proxy hold a function to this; locally the worker and the
// emulators do, so a call that fails after a deploy fails here too.
export const createDevSandboxes = (stackConfigs: StackConfig[]) => {
	const sandboxes: Record<string, DevSandbox> = {}

	for (const stack of stackConfigs) {
		for (const [id, props] of Object.entries(stack.functions ?? {})) {
			if (!props.sandbox) {
				continue
			}

			const allowed = typeof props.sandbox === 'object' ? props.sandbox : {}
			const toRoute = (type: string) => (route: string) => {
				const [stackName, name] = route.split(':')

				return formatRoute(stackName!, type, name!)
			}

			sandboxes[formatRoute(stack.name, 'function', id)] = {
				routes: [
					...(allowed.functions ?? []).map(toRoute('function')),
					...(allowed.tasks ?? []).map(toRoute('task')),
				],
				configs: (allowed.configs ?? []).map(name => kebabCase(name)),
				// Only the service of a permission is checked, not its actions or resources.
				services: (props.permissions ?? [])
					.filter(permission => permission.effect === 'allow')
					.flatMap(permission => permission.actions.map(action => action.split(':')[0]!)),
			}
		}
	}

	return sandboxes
}

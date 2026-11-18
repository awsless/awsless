import { type DevSandbox, formatRouteKey } from 'awsless'
import { kebabCase } from 'change-case'
import { StackConfig } from '../config/stack.js'

export type { DevSandbox }

// The header an invoke of a sandboxed function carries to the lambda
// emulator, which checks its route against the function's allowlist.
export const SANDBOX_HEADER = 'x-awsless-sandbox'

// The header of an AWS call the function has no permission for, on its way
// to the server that denies it.
export const DENIED_HEADER = 'x-awsless-sandbox-denied'

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

				return formatRouteKey(stackName!, type, name!)
			}

			sandboxes[formatRouteKey(stack.name, 'function', id)] = {
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

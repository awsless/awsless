import { createApp } from '../src/app'
import { AppSchema } from '../src/config/app'
import { StackSchema } from '../src/config/stack'

export const credentials = async () => ({
	accessKeyId: 'test',
	secretAccessKey: 'test',
})

export const notFound = (name = 'ResourceNotFoundException') => {
	const error = new Error('Not found')
	error.name = name

	return error
}

export const createTestApp = (
	props: {
		// Since the config flattened, `defaults` merges into the same
		// root object as `app` - it survives purely as a readable alias
		// for feature default options in the test cases.
		defaults?: Record<string, unknown>
		deploymentId?: string
		stacks?: Record<string, unknown>[]
		app?: Record<string, unknown>
	} = {}
) => {
	const appConfig = AppSchema.parse({
		name: 'test-app',
		region: 'us-east-1',
		profile: 'test',
		...(props.defaults ?? {}),
		...props.app,
	})

	return {
		...createApp({
			appConfig,
			stackConfigs: (props.stacks ?? []).map(stack => ({
				...StackSchema.parse(stack),
				file: `${stack.name}/stack.jsonc`,
			})),
			accountId: '123456789012',
			deploymentId: props.deploymentId,
		}),
		appConfig,
	}
}

export const sent = <Command>(
	send: { mock: { calls: Array<[unknown, ...unknown[]]> } },
	type: new (...args: any[]) => Command
) => {
	return send.mock.calls.map(([command]) => command).filter((command): command is Command => command instanceof type)
}

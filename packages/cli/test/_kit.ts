import { App, getMeta } from '@terraforge/core'
import { createApp } from '../src/app'
import { AppSchema } from '../src/config/app'
import { StackSchema } from '../src/config/stack'
import { SharedData } from '../src/shared'

// The synthed resources of the given type, as their plain meta.
export const listResources = (app: App, type?: string) => {
	return app.resources.map(getMeta).filter(meta => typeof type === 'undefined' || meta.type === type)
}

// The app wide permission statements that grant the given action.
export const findStatements = (shared: SharedData, action: string) => {
	return [...shared.get('bundle', 'main').statements].filter(statement => statement.actions.includes(action))
}

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

import { createApp } from '../src/app'
import { AppSchema } from '../src/config/app'

export const credentials = async () => ({
	accessKeyId: 'test',
	secretAccessKey: 'test',
})

export const notFound = (name = 'ResourceNotFoundException') => {
	const error = new Error('Not found')
	error.name = name

	return error
}

export const createTestApp = (defaults: Record<string, unknown> = {}, deploymentId?: string) => {
	const appConfig = AppSchema.parse({
		name: 'test-app',
		region: 'us-east-1',
		profile: 'test',
		defaults,
	})

	return {
		...createApp({
			appConfig,
			stackConfigs: [],
			accountId: '123456789012',
			deploymentId,
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

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))

vi.mock('@aws-sdk/client-lambda', () => ({
	LambdaClient: class {
		send = sendMock
	},
	InvokeCommand: class {
		constructor(readonly input: unknown) {}
	},
}))

describe('sandbox proxy handler', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
		sendMock.mockReset()
	})

	it('forwards allowlisted routes to the live bundle', async () => {
		vi.stubEnv('APP', 'test-app')
		vi.stubEnv('SANDBOX_ROUTES', JSON.stringify(['stack:function:allowed', 'stack:task:work']))
		sendMock.mockResolvedValue({ Payload: Buffer.from(JSON.stringify({ ok: true })) })

		const { default: handler } = await import('../src/feature/function/server/sandbox-proxy')
		const result = await handler({ '$awsless-route': 'stack:function:allowed', event: { n: 1 } } as never)

		expect(result).toStrictEqual({ ok: true })

		const command = sendMock.mock.calls[0]![0] as { input: Record<string, unknown> }

		expect(command.input).toMatchObject({
			FunctionName: 'test-app--function--bundle',
			Qualifier: 'live',
			InvocationType: 'RequestResponse',
			Payload: JSON.stringify({ '$awsless-route': 'stack:function:allowed', event: { n: 1 } }),
		})
	})

	it('forwards task routes asynchronously', async () => {
		vi.stubEnv('APP', 'test-app')
		vi.stubEnv('SANDBOX_ROUTES', JSON.stringify(['stack:task:work']))
		sendMock.mockResolvedValue({ StatusCode: 202 })

		const { default: handler } = await import('../src/feature/function/server/sandbox-proxy')
		const result = await handler({ '$awsless-route': 'stack:task:work', event: {} } as never)

		expect(result).toBeUndefined()

		const command = sendMock.mock.calls[0]![0] as { input: Record<string, unknown> }

		expect(command.input).toMatchObject({
			InvocationType: 'Event',
		})
	})

	it('rejects routes outside the allowlist', async () => {
		vi.stubEnv('SANDBOX_ROUTES', JSON.stringify(['stack:function:allowed']))

		const { default: handler } = await import('../src/feature/function/server/sandbox-proxy')

		await expect(handler({ '$awsless-route': 'stack:function:other' })).rejects.toThrow(
			'Sandboxed route is not allowed: stack:function:other'
		)
		await expect(handler({})).rejects.toThrow('Sandboxed route is not allowed')
		expect(sendMock).not.toHaveBeenCalled()
	})

	it('rethrows bundle errors with their original name', async () => {
		vi.stubEnv('SANDBOX_ROUTES', JSON.stringify(['stack:function:allowed']))
		sendMock.mockResolvedValue({
			FunctionError: 'Unhandled',
			Payload: Buffer.from(JSON.stringify({ errorType: 'SomeError', errorMessage: 'It broke' })),
		})

		const { default: handler } = await import('../src/feature/function/server/sandbox-proxy')

		await expect(handler({ '$awsless-route': 'stack:function:allowed' })).rejects.toMatchObject({
			name: 'SomeError',
			message: 'It broke',
		})
	})
})

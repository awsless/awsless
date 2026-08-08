import {
	AddPermissionCommand,
	CreateAliasCommand,
	CreateFunctionUrlConfigCommand,
	DeleteFunctionUrlConfigCommand,
	GetAliasCommand,
	LambdaClient,
	PutFunctionEventInvokeConfigCommand,
	UpdateAliasCommand,
} from '@aws-sdk/client-lambda'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLambdaProvider } from '../src/formation/lambda'
import { credentials, notFound, sent } from './_kit'

const sourceArn = 'arn:aws:cloudfront::123456789012:distribution/test'
const sourceArns = [sourceArn]
const onFailureArn = 'arn:aws:s3:::test-on-failure'

const conflict = () => {
	const error = new Error('Alias already exists')
	error.name = 'ResourceConflictException'

	return error
}

const mockLambda = (options: { liveVersion?: string; liveDescription?: string; aliasExists?: boolean } = {}) => {
	return vi.spyOn(LambdaClient.prototype, 'send').mockImplementation(async command => {
		if (command instanceof GetAliasCommand) {
			if (options.liveVersion) {
				return { Description: options.liveDescription, FunctionVersion: options.liveVersion }
			}

			throw notFound()
		}

		if (command instanceof CreateAliasCommand) {
			if (options.aliasExists) {
				throw conflict()
			}

			return {}
		}

		if (command instanceof CreateFunctionUrlConfigCommand) {
			return {
				FunctionUrl: `https://${command.input.Qualifier}.lambda-url.us-east-1.on.aws/`,
			}
		}

		if (
			command instanceof UpdateAliasCommand ||
			command instanceof AddPermissionCommand ||
			command instanceof DeleteFunctionUrlConfigCommand ||
			command instanceof PutFunctionEventInvokeConfigCommand
		) {
			return {}
		}

		throw new Error('Unexpected command')
	})
}

describe('Lambda deployment alias', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should tag the published version & configure async invokes', async () => {
		const send = mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })

		await provider.createResource({
			type: 'deployment-alias',
			state: {
				functionName: 'test-function',
				functionVersion: '1',
				id: 'main-1',
				onFailureArn,
			},
		})

		const alias = sent(send, CreateAliasCommand)[0]!
		const config = sent(send, PutFunctionEventInvokeConfigCommand)[0]!

		expect(alias.input).toMatchObject({
			FunctionName: 'test-function',
			FunctionVersion: '1',
			Name: 'main-1',
		})
		expect(config.input).toMatchObject({
			FunctionName: 'test-function',
			Qualifier: 'main-1',
			MaximumRetryAttempts: 2,
			DestinationConfig: { OnFailure: { Destination: onFailureArn } },
		})
	})

	it('should repoint a reused local deployment id to the new version', async () => {
		const send = mockLambda({ aliasExists: true })
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })

		await provider.updateResource({
			type: 'deployment-alias',
			priorState: {
				functionName: 'test-function',
				functionVersion: '1',
				id: 'local-0',
			},
			proposedState: {
				functionName: 'test-function',
				functionVersion: '2',
				id: 'local-0',
			},
		})

		const update = sent(send, UpdateAliasCommand)[0]!

		expect(update.input).toMatchObject({
			FunctionVersion: '2',
			Name: 'local-0',
		})
	})
})

describe('Lambda live target', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should use the proposed version when live does not exist yet', async () => {
		mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })

		const result = await provider.createResource({
			type: 'live-target',
			state: {
				functionName: 'test-function',
				functionVersion: '1',
			},
		})

		expect(result.state.liveVersion).toBe('1')
		expect(result.state.liveDescription).toBeUndefined()
	})

	it('should preserve the existing live target while staging a new version', async () => {
		mockLambda({ liveVersion: '7', liveDescription: 'main-7' })
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })

		const result = await provider.updateResource({
			type: 'live-target',
			priorState: {
				functionName: 'test-function',
				functionVersion: '7',
				liveVersion: '7',
				liveDescription: 'main-7',
			},
			proposedState: {
				functionName: 'test-function',
				functionVersion: '8',
			},
		})

		expect(result.state.liveVersion).toBe('7')
		expect(result.state.liveDescription).toBe('main-7')
	})
})

describe('Lambda function deployment', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should create a URL & CloudFront permissions on the deployment alias', async () => {
		const send = mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })
		const result = await provider.createResource({
			type: 'function-deployment',
			state: {
				functionName: 'test-function',
				id: 'main-1',
				sourceArns,
			},
		})

		const permissions = sent(send, AddPermissionCommand).map(command => command.input)

		expect(result.state.url).toBe('https://main-1.lambda-url.us-east-1.on.aws/')
		expect(permissions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					Qualifier: 'main-1',
					Action: 'lambda:InvokeFunctionUrl',
					Principal: 'cloudfront.amazonaws.com',
					SourceArn: sourceArn,
					FunctionUrlAuthType: 'AWS_IAM',
				}),
				expect.objectContaining({
					Qualifier: 'main-1',
					Action: 'lambda:InvokeFunction',
					Principal: 'cloudfront.amazonaws.com',
					SourceArn: sourceArn,
					InvokedViaFunctionUrl: true,
				}),
			])
		)
		expect(permissions).toHaveLength(2)
	})

	it('should create a new url without changing the previous deployment', async () => {
		mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })
		const result = await provider.updateResource({
			type: 'function-deployment',
			priorState: {
				functionName: 'test-function',
				id: 'main-1',
				sourceArns,
				url: 'https://main-1.lambda-url.us-east-1.on.aws/',
				oldDeployments: [],
			},
			proposedState: {
				functionName: 'test-function',
				id: 'main-2',
				sourceArns,
			},
		})

		expect(result.state.url).toBe('https://main-2.lambda-url.us-east-1.on.aws/')
		expect(result.state.oldDeployments).toEqual(['main-1'])
	})

	it('should delete the urls of every tracked deployment', async () => {
		const send = mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })

		await provider.deleteResource({
			type: 'function-deployment',
			state: {
				functionName: 'test-function',
				id: 'main-2',
				sourceArns,
				url: 'https://main-2.lambda-url.us-east-1.on.aws/',
				oldDeployments: ['main-1'],
			},
		})

		expect(sent(send, DeleteFunctionUrlConfigCommand).map(command => command.input.Qualifier)).toEqual([
			'main-2',
			'main-1',
		])
	})
})

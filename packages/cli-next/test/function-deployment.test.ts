import {
	AddPermissionCommand,
	CreateAliasCommand,
	CreateFunctionUrlConfigCommand,
	DeleteAliasCommand,
	GetAliasCommand,
	LambdaClient,
	PutFunctionEventInvokeConfigCommand,
} from '@aws-sdk/client-lambda'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLambdaProvider } from '../src/formation/lambda'
import { credentials, notFound, sent } from './_kit'

const sourceArn = 'arn:aws:cloudfront::123456789012:distribution/test'
const previewSourceArn = 'arn:aws:cloudfront::123456789012:distribution/preview'
const sourceArns = [sourceArn, previewSourceArn]
const onFailureArn = 'arn:aws:s3:::test-on-failure'

const mockLambda = (liveVersion?: string, liveDescription?: string) => {
	return vi.spyOn(LambdaClient.prototype, 'send').mockImplementation(async command => {
		if (command instanceof GetAliasCommand) {
			if (liveVersion) {
				return { Description: liveDescription, FunctionVersion: liveVersion }
			}

			throw notFound()
		}

		if (command instanceof CreateAliasCommand) {
			return {
				AliasArn: `arn:aws:lambda:us-east-1:123456789012:function:test-function:${command.input.Name}`,
			}
		}

		if (command instanceof CreateFunctionUrlConfigCommand) {
			return {
				FunctionUrl: `https://${command.input.Qualifier}.lambda-url.us-east-1.on.aws/`,
			}
		}

		if (command instanceof AddPermissionCommand) {
			return {}
		}

		if (command instanceof DeleteAliasCommand) {
			return {}
		}

		if (command instanceof PutFunctionEventInvokeConfigCommand) {
			return {}
		}

		throw new Error('Unexpected command')
	})
}

describe('Lambda bundle deployment', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should use the proposed version when live does not exist yet', async () => {
		const send = mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })
		const result = await provider.createResource({
			type: 'bundle-deployment',
			state: {
				deploymentId: 1,
				functionName: 'test-function',
				functionVersion: '1',
				onFailureArn,
			},
		})

		expect(result.state).toEqual({
			deploymentId: 1,
			functionName: 'test-function',
			functionVersion: '1',
			onFailureArn,
			deploymentAlias: 'deployment-1',
			deploymentAliases: ['deployment-1'],
			liveDescription: undefined,
			liveVersion: '1',
		})
		expect(send.mock.calls.map(([command]) => command)).toEqual([
			expect.any(GetAliasCommand),
			expect.any(CreateAliasCommand),
			expect.any(PutFunctionEventInvokeConfigCommand),
		])
		expect(send.mock.calls[1]![0].input.Name).toBe('deployment-1')
	})

	it('should preserve the existing live target while staging a new version', async () => {
		const liveDescription = '$awsless:deployment:7:8'
		const send = mockLambda('7', liveDescription)
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })
		const result = await provider.createResource({
			type: 'bundle-deployment',
			state: {
				deploymentId: 8,
				functionName: 'test-function',
				functionVersion: '8',
				onFailureArn,
			},
		})

		expect(result.state.liveVersion).toBe('7')
		expect(result.state.liveDescription).toBe(liveDescription)
		expect(send.mock.calls.map(([command]) => command.input)).toContainEqual({
			FunctionName: 'test-function',
			FunctionVersion: '8',
			Name: 'deployment-8',
		})
		expect(
			send.mock.calls.some(([command]) => command instanceof CreateAliasCommand && command.input.Name === 'live')
		).toBe(false)
	})

	it('should retain deployment aliases across updates', async () => {
		const send = mockLambda('1')
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })
		const result = await provider.updateResource({
			type: 'bundle-deployment',
			priorState: {
				deploymentId: 1,
				functionName: 'test-function',
				functionVersion: '1',
				onFailureArn,
				deploymentAlias: 'deployment-1',
				deploymentAliases: ['deployment-1'],
				liveDescription: '$awsless:deployment:1:1',
				liveVersion: '1',
			},
			proposedState: {
				deploymentId: 2,
				functionName: 'test-function',
				functionVersion: '2',
				onFailureArn,
			},
		})

		expect(send.mock.calls.map(([command]) => command)).toEqual([
			expect.any(GetAliasCommand),
			expect.any(CreateAliasCommand),
			expect.any(PutFunctionEventInvokeConfigCommand),
		])
		expect(result.state.deploymentAliases).toEqual(['deployment-1', 'deployment-2'])
		expect(result.state.liveVersion).toBe('1')
	})

	it('should delete only deployment aliases', async () => {
		const send = mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })

		await provider.deleteResource({
			type: 'bundle-deployment',
			state: {
				deploymentId: 2,
				functionName: 'test-function',
				functionVersion: '2',
				onFailureArn,
				deploymentAlias: 'deployment-2',
				deploymentAliases: ['deployment-1', 'deployment-2'],
				liveDescription: '$awsless:deployment:1:1',
				liveVersion: '1',
			},
		})

		expect(send.mock.calls.map(([command]) => command)).toEqual([
			expect.any(DeleteAliasCommand),
			expect.any(DeleteAliasCommand),
		])
		expect(send.mock.calls.map(([command]) => command.input.Name)).toEqual(['deployment-1', 'deployment-2'])
	})
})

describe('Lambda function deployment', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should create an immutable alias, URL, and CloudFront permissions', async () => {
		const send = mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })
		const result = await provider.createResource({
			type: 'function-deployment',
			state: {
				functionName: 'test-function',
				functionVersion: '1',
				id: 'main',
				sourceArns,
				retention: 60,
			},
		})

		const alias = result.state.alias as string
		const permissions = sent(send, AddPermissionCommand).map(command => command.input)

		expect(alias).toMatch(/^main-[a-f0-9]{10}$/)
		expect(result.state.url).toBe(`https://${alias}.lambda-url.us-east-1.on.aws/`)
		expect(permissions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					Qualifier: alias,
					Action: 'lambda:InvokeFunctionUrl',
					Principal: 'cloudfront.amazonaws.com',
					SourceArn: sourceArn,
					FunctionUrlAuthType: 'AWS_IAM',
				}),
				expect.objectContaining({
					Qualifier: alias,
					Action: 'lambda:InvokeFunction',
					Principal: 'cloudfront.amazonaws.com',
					SourceArn: sourceArn,
					InvokedViaFunctionUrl: true,
				}),
			])
		)
		expect(permissions).toHaveLength(4)
		expect(new Set(permissions.map(permission => permission.SourceArn))).toEqual(new Set(sourceArns))
	})

	it('should create a new alias without changing the previous deployment', async () => {
		const send = mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })
		const priorState = {
			functionName: 'test-function',
			functionVersion: '1',
			id: 'main',
			sourceArns,
			alias: 'main-previous',
			url: 'https://previous.lambda-url.us-east-1.on.aws/',
			oldDeployments: [],
		}
		const result = await provider.updateResource({
			type: 'function-deployment',
			priorState,
			proposedState: {
				functionName: 'test-function',
				functionVersion: '2',
				id: 'main',
				sourceArns,
			},
		})

		const createdAlias = sent(send, CreateAliasCommand)[0]!

		expect(createdAlias.input.Name).not.toBe(priorState.alias)
		expect(result.state.alias).toBe(createdAlias.input.Name)
		expect(result.state.oldDeployments).toEqual([priorState.alias])
	})

	it('should keep the current deployment when the function version is unchanged', async () => {
		const send = mockLambda()
		const provider = createLambdaProvider({ credentials, region: 'us-east-1' })
		const created = await provider.createResource({
			type: 'function-deployment',
			state: {
				functionName: 'test-function',
				functionVersion: '1',
				id: 'main',
				sourceArns,
			},
		})
		const priorState = {
			...created.state,
			oldDeployments: ['production'],
		}
		send.mockClear()
		const result = await provider.updateResource({
			type: 'function-deployment',
			priorState,
			proposedState: {
				functionName: 'test-function',
				functionVersion: '1',
				id: 'main',
				sourceArns,
			},
		})

		expect(send).not.toHaveBeenCalled()
		expect(result.state).toEqual(priorState)
	})
})

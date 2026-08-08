import {
	AddPermissionCommand,
	CreateAliasCommand,
	CreateFunctionUrlConfigCommand,
	DeleteFunctionUrlConfigCommand,
	GetFunctionUrlConfigCommand,
	LambdaClient,
	PutFunctionEventInvokeConfigCommand,
	UpdateAliasCommand,
} from '@aws-sdk/client-lambda'
import { createCustomProvider, createCustomResourceClass, Input, OptionalOutput, Output } from '@terraforge/core'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials, isError } from '../util/aws'
import { getLambdaAlias, LIVE_LAMBDA_ALIAS } from '../util/lambda'

// Every deployment tags the published version of a lambda with an
// immutable alias named after the deployment id. The alias carries
// the async retry & on-failure config, and pruning a deployment
// deletes its aliases everywhere.

type DeploymentAliasInput = {
	functionName: Input<string>
	functionVersion: Input<string>
	id: Input<string>
	onFailureArn?: Input<string>
}

export const DeploymentAlias = createCustomResourceClass<DeploymentAliasInput, {}>('lambda', 'deployment-alias')

// Reads the current live alias target, so the declarative live alias
// keeps serving the promoted deployment while a new one is staged.

type LiveTargetInput = {
	functionName: Input<string>
	functionVersion: Input<string>
}

type LiveTargetOutput = {
	liveDescription: OptionalOutput<string>
	liveVersion: Output<string>
}

export const LiveTarget = createCustomResourceClass<LiveTargetInput, LiveTargetOutput>('lambda', 'live-target')

// The function url & cloudfront permissions that make a deployment
// alias reachable as a router origin.

type FunctionDeploymentInput = {
	functionName: Input<string>
	id: Input<string>
	sourceArns: Input<Input<string>[]>
}

type FunctionDeploymentOutput = {
	url: Output<string>
}

export const FunctionDeployment = createCustomResourceClass<FunctionDeploymentInput, FunctionDeploymentOutput>(
	'lambda',
	'function-deployment'
)

type ProviderProps = {
	credentials: Credentials
	region: Region
}

export const createLambdaProvider = ({ credentials, region }: ProviderProps) => {
	const lambda = new LambdaClient({ credentials, region })
	const deploymentAliasInputSchema = z.object({
		functionName: z.string(),
		functionVersion: z.string(),
		id: z.string(),
		onFailureArn: z.string().optional(),
	})
	const liveTargetInputSchema = z.object({
		functionName: z.string(),
		functionVersion: z.string(),
	})
	const functionDeploymentInputSchema = z.object({
		functionName: z.string(),
		id: z.string(),
		sourceArns: z.array(z.string()),
	})
	const functionDeploymentStateSchema = functionDeploymentInputSchema.extend({
		url: z.string(),
		oldDeployments: z.array(z.string()).default([]),
	})
	const createDeploymentAlias = async (state: z.output<typeof deploymentAliasInputSchema>) => {
		try {
			await lambda.send(
				new CreateAliasCommand({
					FunctionName: state.functionName,
					FunctionVersion: state.functionVersion,
					Name: state.id,
				})
			)
		} catch (error) {
			if (!isError(error, 'ResourceConflictException')) {
				throw error
			}

			// Only local deploys reuse a deployment id, so the alias
			// needs to follow the newly published version.
			await lambda.send(
				new UpdateAliasCommand({
					FunctionName: state.functionName,
					FunctionVersion: state.functionVersion,
					Name: state.id,
				})
			)
		}

		await lambda.send(
			new PutFunctionEventInvokeConfigCommand({
				FunctionName: state.functionName,
				Qualifier: state.id,
				MaximumRetryAttempts: 2,
				DestinationConfig: state.onFailureArn
					? {
							OnFailure: {
								Destination: state.onFailureArn,
							},
						}
					: undefined,
			})
		)

		return state
	}
	const readLiveTarget = async (state: z.output<typeof liveTargetInputSchema>) => {
		const result = await getLambdaAlias(lambda, state.functionName, LIVE_LAMBDA_ALIAS)

		return {
			...state,
			liveDescription: result?.Description,
			liveVersion: result?.FunctionVersion ?? state.functionVersion,
		}
	}
	const createFunctionDeployment = async (state: z.output<typeof functionDeploymentInputSchema>) => {
		let url: string

		try {
			const result = await lambda.send(
				new CreateFunctionUrlConfigCommand({
					FunctionName: state.functionName,
					Qualifier: state.id,
					AuthType: 'AWS_IAM',
				})
			)

			url = result.FunctionUrl!
		} catch (error) {
			if (!isError(error, 'ResourceConflictException')) {
				throw error
			}

			const result = await lambda.send(
				new GetFunctionUrlConfigCommand({
					FunctionName: state.functionName,
					Qualifier: state.id,
				})
			)

			url = result.FunctionUrl!
		}

		const addPermission = async (props: {
			statementId: string
			action: string
			sourceArn: string
			functionUrlAuthType?: 'AWS_IAM'
			invokedViaFunctionUrl?: boolean
		}) => {
			try {
				await lambda.send(
					new AddPermissionCommand({
						FunctionName: state.functionName,
						Qualifier: state.id,
						StatementId: props.statementId,
						Action: props.action,
						Principal: 'cloudfront.amazonaws.com',
						SourceArn: props.sourceArn,
						FunctionUrlAuthType: props.functionUrlAuthType,
						InvokedViaFunctionUrl: props.invokedViaFunctionUrl,
					})
				)
			} catch (error) {
				if (!isError(error, 'ResourceConflictException')) {
					throw error
				}
			}
		}

		await Promise.all(
			state.sourceArns.flatMap((sourceArn, index) => [
				addPermission({
					statementId: `cloudfront-url-${index}`,
					action: 'lambda:InvokeFunctionUrl',
					functionUrlAuthType: 'AWS_IAM',
					sourceArn,
				}),
				addPermission({
					statementId: `cloudfront-invoke-${index}`,
					action: 'lambda:InvokeFunction',
					invokedViaFunctionUrl: true,
					sourceArn,
				}),
			])
		)

		return url
	}
	const deleteFunctionUrl = async (functionName: string, qualifier: string) => {
		try {
			await lambda.send(
				new DeleteFunctionUrlConfigCommand({
					FunctionName: functionName,
					Qualifier: qualifier,
				})
			)
		} catch (error) {
			if (!isError(error, 'ResourceNotFoundException')) {
				throw error
			}
		}
	}
	return createCustomProvider('lambda', {
		// Backwards compatibility for old states, can be removed later.
		'update-function-code': {},
		'bundle-deployment': {},
		'version-event-invoke-config': {},
		'deployment-alias': {
			async createResource(props) {
				const state = deploymentAliasInputSchema.parse(props.state)

				return createDeploymentAlias(state)
			},
			async updateResource(props) {
				const proposed = deploymentAliasInputSchema.parse(props.proposedState)

				return createDeploymentAlias(proposed)
			},
		},
		'live-target': {
			async createResource(props) {
				const state = liveTargetInputSchema.parse(props.state)

				return readLiveTarget(state)
			},
			async updateResource(props) {
				const proposed = liveTargetInputSchema.parse(props.proposedState)

				return readLiveTarget(proposed)
			},
		},
		'function-deployment': {
			async createResource(props) {
				const state = functionDeploymentInputSchema.parse(props.state)
				const url = await createFunctionDeployment(state)

				return {
					...state,
					url,
					oldDeployments: [],
				}
			},
			async updateResource(props) {
				const prior = functionDeploymentStateSchema.parse(props.priorState)
				const proposed = functionDeploymentInputSchema.parse(props.proposedState)
				const url = await createFunctionDeployment(proposed)
				const oldDeployments = prior.oldDeployments.filter(item => item !== proposed.id)

				if (proposed.id !== prior.id) {
					oldDeployments.push(prior.id)
				}

				return {
					...proposed,
					url,
					oldDeployments,
				}
			},
			async deleteResource(props) {
				const state = functionDeploymentStateSchema.parse(props.state)

				for (const id of new Set([state.id, ...state.oldDeployments])) {
					await deleteFunctionUrl(state.functionName, id)
				}
			},
		},
	})
}

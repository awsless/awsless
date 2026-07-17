import {
	AddPermissionCommand,
	CreateAliasCommand,
	CreateFunctionUrlConfigCommand,
	GetFunctionUrlConfigCommand,
	LambdaClient,
	PutFunctionEventInvokeConfigCommand,
} from '@aws-sdk/client-lambda'
import { createCustomProvider, createCustomResourceClass, Input, OptionalOutput, Output } from '@terraforge/core'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials, isError } from '../util/aws'
import { createLambdaAlias, deleteLambdaAlias, getLambdaAlias, getDeploymentLambdaAliasName, LIVE_LAMBDA_ALIAS } from '../util/lambda'

type FunctionDeploymentInput = {
	functionName: Input<string>
	functionVersion: Input<string>
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

type BundleDeploymentInput = {
	deploymentId: Input<string>
	functionName: Input<string>
	functionVersion: Input<string>
	onFailureArn: Input<string>
}

type BundleDeploymentOutput = {
	liveDescription: OptionalOutput<string>
	liveVersion: Output<string>
	url: Output<string>
}

export const BundleDeployment = createCustomResourceClass<BundleDeploymentInput, BundleDeploymentOutput>(
	'lambda',
	'bundle-deployment'
)

type ProviderProps = {
	credentials: Credentials
	region: Region
}

export const createLambdaProvider = ({ credentials, region }: ProviderProps) => {
	const lambda = new LambdaClient({ credentials, region })
	const functionDeploymentInputSchema = z.object({
		functionName: z.string(),
		functionVersion: z.string(),
		id: z.string(),
		sourceArns: z.array(z.string()),
	})
	const functionDeploymentStateSchema = functionDeploymentInputSchema.extend({
		alias: z.string(),
		url: z.string(),
		oldDeployments: z.array(z.string()),
	})
	const bundleDeploymentInputSchema = z.object({
		deploymentId: z.string(),
		functionName: z.string(),
		functionVersion: z.string(),
		onFailureArn: z.string(),
	})
	const bundleDeploymentStateSchema = bundleDeploymentInputSchema.extend({
		deploymentAlias: z.string(),
		deploymentAliases: z.array(z.string()),
		liveDescription: z.string().optional(),
		liveVersion: z.string(),
		url: z.string().optional(),
	})
	const getFunctionDeploymentAlias = (state: z.output<typeof functionDeploymentInputSchema>) => {
		const hash = createHash('sha1')
			.update(state.functionName)
			.update(state.functionVersion)
			.update([...state.sourceArns].sort().join(','))
			.digest('hex')
			.slice(0, 10)

		return `${state.id}-${hash}`
	}
	const getLiveAlias = async (state: z.output<typeof bundleDeploymentInputSchema>) => {
		const result = await getLambdaAlias(lambda, state.functionName, LIVE_LAMBDA_ALIAS)

		return result
			? {
					liveDescription: result.Description,
					liveVersion: result.FunctionVersion!,
				}
			: {
					liveDescription: undefined,
					liveVersion: state.functionVersion,
				}
	}
	const configureVersion = async (state: z.output<typeof bundleDeploymentInputSchema>) => {
		await lambda.send(
			new PutFunctionEventInvokeConfigCommand({
				FunctionName: state.functionName,
				Qualifier: state.functionVersion,
				MaximumRetryAttempts: 2,
				DestinationConfig: {
					OnFailure: {
						Destination: state.onFailureArn,
					},
				},
			})
		)
	}
	// The public url of a deployment alias serves the deployment preview.
	const createPublicUrl = async (functionName: string, alias: string) => {
		let url: string

		try {
			const result = await lambda.send(
				new CreateFunctionUrlConfigCommand({
					FunctionName: functionName,
					Qualifier: alias,
					AuthType: 'NONE',
				})
			)

			url = result.FunctionUrl!
		} catch (error) {
			if (!isError(error, 'ResourceConflictException')) {
				throw error
			}

			const result = await lambda.send(
				new GetFunctionUrlConfigCommand({
					FunctionName: functionName,
					Qualifier: alias,
				})
			)

			url = result.FunctionUrl!
		}

		// Public urls require both invoke permissions since October 2025.
		const permissions = [
			{
				StatementId: 'public-url',
				Action: 'lambda:InvokeFunctionUrl',
				FunctionUrlAuthType: 'NONE' as const,
			},
			{
				StatementId: 'public-invoke',
				Action: 'lambda:InvokeFunction',
				InvokedViaFunctionUrl: true,
			},
		]

		for (const permission of permissions) {
			try {
				await lambda.send(
					new AddPermissionCommand({
						FunctionName: functionName,
						Qualifier: alias,
						Principal: '*',
						...permission,
					})
				)
			} catch (error) {
				if (!isError(error, 'ResourceConflictException')) {
					throw error
				}
			}
		}

		return url
	}
	const createBundleDeployment = async (state: z.output<typeof bundleDeploymentInputSchema>) => {
		const deploymentAlias = getDeploymentLambdaAliasName(state.deploymentId)
		const live = await getLiveAlias(state)

		await createLambdaAlias(lambda, {
			functionName: state.functionName,
			functionVersion: state.functionVersion,
			name: deploymentAlias,
		})
		await configureVersion(state)
		const url = await createPublicUrl(state.functionName, deploymentAlias)

		return {
			...state,
			deploymentAlias,
			deploymentAliases: [deploymentAlias],
			url,
			...live,
		}
	}
	const createFunctionDeployment = async (state: z.output<typeof functionDeploymentInputSchema>, alias: string) => {
		try {
			await lambda.send(
				new CreateAliasCommand({
					FunctionName: state.functionName,
					FunctionVersion: state.functionVersion,
					Name: alias,
				})
			)
		} catch (error) {
			if (!isError(error, 'ResourceConflictException')) {
				throw error
			}
		}

		let url: string

		try {
			const result = await lambda.send(
				new CreateFunctionUrlConfigCommand({
					FunctionName: state.functionName,
					Qualifier: alias,
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
					Qualifier: alias,
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
						Qualifier: alias,
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
	return createCustomProvider('lambda', {
		'bundle-deployment': {
			async createResource(props) {
				const state = bundleDeploymentInputSchema.parse(props.state)

				return createBundleDeployment(state)
			},
			async updateResource(props) {
				const prior = bundleDeploymentStateSchema.parse(props.priorState)
				const proposed = bundleDeploymentInputSchema.parse(props.proposedState)

				if (prior.functionName !== proposed.functionName) {
					const next = await createBundleDeployment(proposed)

					await Promise.all(
						prior.deploymentAliases.map(name => deleteLambdaAlias(lambda, prior.functionName, name))
					)

					return next
				}

				const deploymentAlias = getDeploymentLambdaAliasName(proposed.deploymentId)
				const deploymentAliases = [...prior.deploymentAliases]
				const live = await getLiveAlias(proposed)

				await createLambdaAlias(lambda, {
					functionName: proposed.functionName,
					functionVersion: proposed.functionVersion,
					name: deploymentAlias,
				})

				if (!deploymentAliases.includes(deploymentAlias)) {
					deploymentAliases.push(deploymentAlias)
				}

				await configureVersion(proposed)
				const url = await createPublicUrl(proposed.functionName, deploymentAlias)

				return {
					...proposed,
					deploymentAlias,
					deploymentAliases,
					url,
					...live,
				}
			},
			async deleteResource(props) {
				const state = bundleDeploymentStateSchema.parse(props.state)

				await Promise.all(
					state.deploymentAliases.map(name => deleteLambdaAlias(lambda, state.functionName, name))
				)
			},
		},
		'function-deployment': {
			async createResource(props) {
				const state = functionDeploymentInputSchema.parse(props.state)
				const alias = getFunctionDeploymentAlias(state)
				const url = await createFunctionDeployment(state, alias)

				return {
					...state,
					alias,
					url,
					oldDeployments: [],
				}
			},
			async updateResource(props) {
				const prior = functionDeploymentStateSchema.parse(props.priorState)
				const proposed = functionDeploymentInputSchema.parse(props.proposedState)
				const alias = getFunctionDeploymentAlias(proposed)
				const changed = alias !== prior.alias
				const url = changed ? await createFunctionDeployment(proposed, alias) : prior.url
				const oldDeployments = prior.oldDeployments.filter(item => item !== alias)

				if (changed) {
					oldDeployments.push(prior.alias)
				}

				return {
					...proposed,
					alias,
					url,
					oldDeployments,
				}
			},
			async deleteResource(props) {
				const state = functionDeploymentStateSchema.parse(props.state)
				const aliases = new Set([state.alias, ...state.oldDeployments])

				await Promise.all([...aliases].map(alias => deleteLambdaAlias(lambda, state.functionName, alias)))
			},
		},
	})
}

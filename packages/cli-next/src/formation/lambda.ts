import {
	AddPermissionCommand,
	CreateAliasCommand,
	CreateFunctionUrlConfigCommand,
	DeleteFunctionUrlConfigCommand,
	GetFunctionUrlConfigCommand,
	LambdaClient,
	PutFunctionEventInvokeConfigCommand,
} from '@aws-sdk/client-lambda'
import { createCustomProvider, createCustomResourceClass, Input, OptionalOutput, Output } from '@terraforge/core'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials, isError } from '../util/aws'
import { createAlias, deleteAlias, getAlias, getDeploymentAliasName, LIVE_ALIAS } from '../util/lambda'

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
	deploymentId: Input<number>
	functionName: Input<string>
	functionVersion: Input<string>
	onFailureArn: Input<string>
}

type BundleDeploymentOutput = {
	liveDescription: OptionalOutput<string>
	liveVersion: Output<string>
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
		deploymentId: z.number(),
		functionName: z.string(),
		functionVersion: z.string(),
		onFailureArn: z.string(),
	})
	const bundleDeploymentStateSchema = bundleDeploymentInputSchema.extend({
		deploymentAlias: z.string(),
		deploymentAliases: z.array(z.string()),
		liveDescription: z.string().optional(),
		liveVersion: z.string(),
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
		const result = await getAlias(lambda, state.functionName, LIVE_ALIAS)

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
	const createBundleDeployment = async (state: z.output<typeof bundleDeploymentInputSchema>) => {
		const deploymentAlias = getDeploymentAliasName(state.deploymentId)
		const live = await getLiveAlias(state)

		await createAlias(lambda, {
			functionName: state.functionName,
			functionVersion: state.functionVersion,
			name: deploymentAlias,
		})
		await configureVersion(state)

		return {
			...state,
			deploymentAlias,
			deploymentAliases: [deploymentAlias],
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
	const deleteFunctionDeployment = async (functionName: string, alias: string) => {
		try {
			await lambda.send(
				new DeleteFunctionUrlConfigCommand({
					FunctionName: functionName,
					Qualifier: alias,
				})
			)
		} catch (error) {
			if (!isError(error, 'ResourceNotFoundException')) {
				throw error
			}
		}

		await deleteAlias(lambda, functionName, alias)
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
						prior.deploymentAliases.map(name => deleteAlias(lambda, prior.functionName, name))
					)

					return next
				}

				const deploymentAlias = getDeploymentAliasName(proposed.deploymentId)
				const deploymentAliases = [...prior.deploymentAliases]
				const live = await getLiveAlias(proposed)

				// Upsert unconditionally: a reused deployment id (a re-deploy
				// after a partial failure) must repoint its alias at the newly
				// published version instead of serving the stale one.
				await createAlias(lambda, {
					functionName: proposed.functionName,
					functionVersion: proposed.functionVersion,
					name: deploymentAlias,
				})

				if (!deploymentAliases.includes(deploymentAlias)) {
					deploymentAliases.push(deploymentAlias)
				}

				await configureVersion(proposed)

				return {
					...proposed,
					deploymentAlias,
					deploymentAliases,
					...live,
				}
			},
			async deleteResource(props) {
				const state = bundleDeploymentStateSchema.parse(props.state)

				await Promise.all(state.deploymentAliases.map(name => deleteAlias(lambda, state.functionName, name)))
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

				await Promise.all([...aliases].map(alias => deleteFunctionDeployment(state.functionName, alias)))
			},
		},
	})
}

import { aws } from '@terraforge/aws'
import { Group, Input, Resource } from '@terraforge/core'
import { AppContext, Permission, StackContext } from '../../../feature.js'
import { WebFunctionLiveRevision } from '../../../formation/lambda.js'
import { formatGlobalResourceName, WEB_FUNCTION_ENDPOINT_NAME } from '../../../util/name.js'
import { deployFunctionSourcemaps, formatLoggingConfig, LambdaLogProps } from '../../function/util/function.js'
import { createLogGroup } from '../../on-error-log/util.js'

// Lambda Web Functions run Node.js 24 only, whatever the bundle's runtime.
const WEB_FUNCTION_RUNTIME = 'nodejs24.x'

export type WebFunction = {
	endpoint: aws.lambdaweb.FunctionEndpoint
	// What a router's route table waits for: its code, and CloudFront's right to call it.
	revision: aws.lambdaweb.FunctionRevision
	policy: aws.lambdaweb.ResourcePolicy
}

// What every web function starts from: the app's web function defaults,
// and the function defaults for what they leave out.
export const getWebFunctionDefaults = (ctx: AppContext | StackContext) => {
	const { timeout, log } = ctx.appConfig.webFunction
	const defined = Object.fromEntries(Object.entries(log ?? {}).filter(([, value]) => value !== undefined))

	return {
		timeout: timeout ?? ctx.appConfig.function.timeout,
		log: { ...ctx.appConfig.function.log, ...defined } as LambdaLogProps,
	}
}

// The network connector puts a web function's traffic in the app vpc, like
// the event function's vpc config. Lambda makes its network interfaces with
// the network role. One serves every web function of the app.
export const createWebFunctionNetwork = (ctx: AppContext, group: Group, name: string) => {
	const networkRole = new aws.iam.Role(group, 'network-role', {
		name: formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'bundle',
			resourceName: 'web',
			postfix: 'network',
		}),
		description: `${name} network connector`,
		assumeRolePolicy: JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Action: 'sts:AssumeRole',
					Principal: { Service: 'lambda.amazonaws.com' },
				},
			],
		}),
	})

	const networkPolicy = new aws.iam.RolePolicy(group, 'network-policy', {
		role: networkRole.name,
		name: 'network-connector',
		policy: JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Action: 'ec2:CreateNetworkInterface',
					Resource: [
						'arn:aws:ec2:*:*:network-interface/*',
						'arn:aws:ec2:*:*:subnet/*',
						'arn:aws:ec2:*:*:security-group/*',
					],
				},
				{
					Effect: 'Allow',
					Action: 'ec2:CreateTags',
					Resource: 'arn:aws:ec2:*:*:network-interface/*',
					Condition: {
						StringEquals: {
							'ec2:ManagedResourceOperator': 'network-connectors.lambda.amazonaws.com',
						},
					},
				},
			],
		}),
	})

	const networkConnector = new aws.lambdacore.NetworkConnector(
		group,
		'network-connector',
		{
			name,
			operatorRole: networkRole.arn,
			configuration: [
				{
					vpcEgressConfiguration: [
						{
							associatedComputeResourceTypes: ['WebFunction'],
							networkProtocol: 'DualStack',
							securityGroupIds: [ctx.shared.get('vpc', 'security-group-id')],
							subnetIds: ctx.shared.get('vpc', 'private-subnets'),
						},
					],
				},
			],
		},
		{
			dependsOn: [networkPolicy],
		}
	)

	return networkConnector
}

// A Lambda Web Function and its one endpoint, in the app's region, which only
// the given routers' distributions may call. The app's shared web function
// is one, running a copy of the bundle; so is a route's or ssr's own.
export const createWebFunction = (
	ctx: AppContext | StackContext,
	group: Group,
	props: {
		name: string
		code: aws.s3.BucketObject
		// The file of the code archive Lambda starts.
		entryFile: string
		role: aws.iam.Role
		variables: Record<string, Input<string>>
		timeout: number
		maxConcurrency?: number
		log: LambdaLogProps
		networkConnectorArn: Input<string>
		routers: string[]
		// The event function, when the code is its bundle: it uploads the sourcemaps.
		bundleOf?: string
		dependsOn: Resource[]
		addPermission: (...permissions: Permission[]) => void
	}
): WebFunction => {
	const { name } = props
	const logging = formatLoggingConfig(name, props.log)

	const webFunction = new aws.lambdaweb.Function(group, 'function', { functionName: name })

	// ------------------------------------------------------
	// Logging: Lambda writes the app's logs to the log group and its own system
	// logs to a companion with a ".local" suffix.

	const logGroup = createLogGroup(new Group(group, 'log', 'app'), ctx, {
		name: logging.logGroup,
		retention: props.log.retention,
	})

	const systemLogGroup = createLogGroup(new Group(group, 'log', 'system'), ctx, {
		name: `${logging.logGroup}.local`,
		retention: props.log.retention,
		errorLog: false,
	})

	if (logGroup && systemLogGroup) {
		props.addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`), systemLogGroup.arn.pipe(arn => `${arn}:*`)],
		})
	}

	// ------------------------------------------------------
	// A revision is immutable, and every deployment makes one (its env names
	// the deployment), which promotion puts live. Prune deletes a pruned
	// deployment's revision, as deleting one fails while it still has traffic.

	const revision = new aws.lambdaweb.FunctionRevision(
		group,
		'revision',
		{
			functionName: webFunction.functionName,
			buildConfig: [
				{
					codeConfig: [
						{
							s3Object: [
								{
									bucket: props.code.bucket,
									key: props.code.key,
									versionId: props.code.versionId,
								},
							],
						},
					],
					runtimeConfig: [{ runtime: WEB_FUNCTION_RUNTIME }],
				},
			],
			serviceConfig: [
				{
					executionRoleArn: props.role.arn,
					egressNetworkConnectorArn: props.networkConnectorArn,
					timeoutSeconds: props.timeout,
					maxConcurrencyPerEnvironment: props.maxConcurrency,
					environmentVariables: {
						...props.variables,
						AWS_LAMBDA_NODEJS_ENTRYPOINT: props.entryFile,
						AWSLESS_WEB_FUNCTION_NAME: name,
						AWSLESS_WEB_FUNCTION_TIMEOUT_SECONDS: String(props.timeout),
						// So every deployment has a revision of its own (bundle/server/web-function.ts).
						AWSLESS_DEPLOYMENT_ID: ctx.deploymentId ?? 'local-0',
					},
					telemetryConfig: [
						{
							loggingConfig: [
								{
									logGroup: logging.logGroup,
									applicationLogLevel: logging.applicationLogLevel,
									systemLogLevel: logging.systemLogLevel,
								},
							],
						},
					],
				},
			],
		},
		{
			replaceOnChanges: ['functionName', 'buildConfig', 'serviceConfig'],
			createBeforeReplace: true,
			retainOnDelete: true,
			dependsOn: [
				...props.dependsOn,
				...(logGroup ? [logGroup] : []),
				...(systemLogGroup ? [systemLogGroup] : []),
			],
		}
	)

	// An error's log stream names the revision, so its stack maps back to source.
	deployFunctionSourcemaps(group, ctx, {
		name,
		buildType: props.bundleOf ? 'bundle' : 'function',
		mapsOf: props.bundleOf,
		version: revision.revisionId,
	})

	// The endpoint keeps the promoted deployment's revision; promotion puts
	// a new one live, with the route tables (util/deployment.ts).
	const liveRevision = new WebFunctionLiveRevision(group, 'live-revision', {
		functionName: webFunction.functionName,
		endpointName: WEB_FUNCTION_ENDPOINT_NAME,
		revisionId: revision.revisionId,
		deploymentId: ctx.deploymentId ?? 'local-0',
	})

	const endpoint = new aws.lambdaweb.FunctionEndpoint(group, 'endpoint', {
		functionName: webFunction.functionName,
		endpointName: WEB_FUNCTION_ENDPOINT_NAME,
		endpointType: 'HomeRegion',
		authType: 'IamAuth',
		autoDeploymentMode: 'Disabled',
		revisionWeight: [{ revisionId: liveRevision.liveRevisionId, weight: 100 }],
	})

	// Only the routers' distributions may call the endpoint, signing with
	// always-amz-auth (the router function's web origin).
	const sourceArns = props.routers.map(id =>
		ctx.shared
			.entry('router', 'id', id)
			.pipe(distributionId => `arn:aws:cloudfront::${ctx.accountId}:distribution/${distributionId}`)
	)

	const policy = new aws.lambdaweb.ResourcePolicy(group, 'policy', {
		resourceArn: webFunction.arn,
		policy: $resolve([endpoint.arn, sourceArns], (endpointArn, arns) =>
			JSON.stringify({
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Principal: { Service: 'cloudfront.amazonaws.com' },
						Action: 'lambda:InvokeWebFunctionEndpoint',
						Resource: endpointArn,
						Condition: { ArnLike: { 'aws:SourceArn': arns } },
					},
				],
			})
		),
	})

	return { endpoint, revision, policy }
}

import { aws } from '@terraforge/aws'
import { Group, Input, Resource } from '@terraforge/core'
import { AppContext, Permission } from '../../feature.js'
import { WebFunctionLiveRevision } from '../../formation/lambda.js'
import { formatGlobalResourceName, getWebFunctionName, WEB_FUNCTION_ENDPOINT_NAME } from '../../util/name.js'
import { formatLoggingConfig } from '../function/util.js'
import { createLogGroup } from '../on-error-log/util.js'
import { WEB_FUNCTION_ENTRY_FILE } from './util.js'

// Lambda Web Functions run Node.js 24 only, whatever the bundle's runtime.
const WEB_FUNCTION_RUNTIME = 'nodejs24.x'

export type WebFunction = {
	endpoint: aws.lambdaweb.FunctionEndpoint
	// What a router's route table waits for: its code, and CloudFront's right to call it.
	revision: aws.lambdaweb.FunctionRevision
	policy: aws.lambdaweb.ResourcePolicy
}

// A copy of the bundle as a Lambda Web Function, which serves every router's
// bundle routes: the same code and role, started from its web entry, behind one
// HomeRegion endpoint that only CloudFront may call.
export const createWebFunction = (
	ctx: AppContext,
	props: {
		code: aws.s3.BucketObject
		role: aws.iam.Role
		variables: Record<string, Input<string>>
		timeout: number
		dependsOn: Resource[]
		addPermission: (...permissions: Permission[]) => void
	}
): WebFunction => {
	const defaults = ctx.appConfig.function
	const group = new Group(ctx.base, 'bundle', 'web')
	const name = getWebFunctionName(ctx.app.name)
	const logging = formatLoggingConfig(name, defaults.log)

	const webFunction = new aws.lambdaweb.Function(group, 'function', { functionName: name })

	// ------------------------------------------------------
	// Logging: Lambda writes the app's logs to the log group and its own system
	// logs to a companion with a ".local" suffix.

	const logGroup = createLogGroup(new Group(group, 'log', 'app'), ctx, {
		name: logging.logGroup,
		retention: defaults.log.retention,
	})

	const systemLogGroup = createLogGroup(new Group(group, 'log', 'system'), ctx, {
		name: `${logging.logGroup}.local`,
		retention: defaults.log.retention,
		errorLog: false,
	})

	if (logGroup && systemLogGroup) {
		props.addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`), systemLogGroup.arn.pipe(arn => `${arn}:*`)],
		})
	}

	// ------------------------------------------------------
	// The network connector puts the web function's traffic in the app vpc, like
	// the event function's vpc config. Lambda makes its network interfaces with
	// the network role.

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
					egressNetworkConnectorArn: networkConnector.latestVersionArn,
					timeoutSeconds: props.timeout,
					environmentVariables: {
						...props.variables,
						AWS_LAMBDA_NODEJS_ENTRYPOINT: WEB_FUNCTION_ENTRY_FILE,
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
	const sourceArns = Object.keys(ctx.appConfig.router ?? {}).map(id =>
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

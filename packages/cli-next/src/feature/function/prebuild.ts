import { Duration, seconds, toDays, toSeconds } from '@awsless/duration'
import { mebibytes, Size, toMebibytes } from '@awsless/size'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, Output, Resource, resolveInputs } from '@terraforge/core'
import { pascalCase } from 'change-case'
import { AppContext, Permission, StackContext } from '../../feature.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { compactPolicyStatements, PolicyStatement } from '../bundle/policy.js'
import { filterPattern } from '../on-error-log/util.js'

// Create a standalone lambda from a prebuilt bundle that ships with the
// cli, for internal handlers that must run outside of the app bundle.
export const createPrebuildLambdaFunction = (
	parentGroup: Group,
	ctx: StackContext | AppContext,
	ns: string,
	id: string,
	props: {
		bundleFile: string // The file path of the prebuilt zip archive.
		bundleHash: string // The file path of the prebuilt bundle hash.
		runtime: aws.lambda.FunctionInput['runtime']
		handler: string
		timeout?: Duration
		memorySize?: Size
		architecture?: 'arm64' | 'x86_64'
		vpc?: boolean
		log?: {
			format?: 'text' | 'json'
			level?: string
			system?: string
			retention?: Duration
		}
	}
) => {
	let name: string
	let roleName: string

	const group = new Group(parentGroup, 'function', id)

	if ('stack' in ctx) {
		name = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: id,
		})

		roleName = formatLocalResourceName({
			appName: ctx.app.name,
			stackName: ctx.stack.name,
			resourceType: ns,
			resourceName: id,
			postfix: ctx.appId,
		})
	} else {
		name = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: ns,
			resourceName: id,
		})

		roleName = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: ns,
			resourceName: id,
			postfix: ctx.appId,
		})
	}

	const sourceHash = $file(props.bundleHash)

	const code = new aws.s3.BucketObject(
		group,
		'code',
		{
			bucket: ctx.shared.get('asset', 'bucket').name,
			key: `lambda/${name}.zip`,
			source: relativePath(props.bundleFile),
			sourceHash,
		},
		{
			replaceOnChanges: ['bucket', 'key'],
		}
	)

	// ------------------------------------------------------------
	// The lambda role & permissions.

	const role = new aws.iam.Role(group, 'role', {
		name: roleName,
		description: name,
		assumeRolePolicy: JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Action: 'sts:AssumeRole',
					Principal: {
						Service: ['lambda.amazonaws.com'],
					},
				},
			],
		}),
	})

	const statements: Permission[] = []
	const statementDeps: Set<any> = new Set()

	const addPermission = (...permissions: Permission[]) => {
		statements.push(...permissions)

		for (const dep of findInputDeps(permissions)) {
			statementDeps.add(dep)
		}
	}

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'lambda-policy',
		policy: new Output(statementDeps, async (resolve: (value: string) => void) => {
			const list = (await resolveInputs(statements)) as PolicyStatement[]

			resolve(
				JSON.stringify({
					Version: '2012-10-17',
					Statement: compactPolicyStatements(list).map(statement => ({
						Effect: pascalCase(statement.effect ?? 'allow'),
						Action: statement.actions,
						Resource: statement.resources,
						Condition: statement.conditions,
					})),
				})
			)
		}),
	})

	// ------------------------------------------------------------
	// VPC

	const dependsOn: Resource[] = []

	if (props.vpc) {
		dependsOn.push(
			new aws.iam.RolePolicy(group, 'vpc-policy', {
				role: role.name,
				name: 'lambda-vpc-policy',
				policy: JSON.stringify({
					Version: '2012-10-17',
					Statement: [
						{
							Effect: 'Allow',
							Action: [
								'ec2:CreateNetworkInterface',
								'ec2:DescribeNetworkInterfaces',
								'ec2:DescribeSubnets',
								'ec2:DeleteNetworkInterface',
								'ec2:AssignPrivateIpAddresses',
								'ec2:UnassignPrivateIpAddresses',
							],
							Resource: ['*'],
						},
					],
				}),
			})
		)
	}

	// ------------------------------------------------------------
	// The lambda function.

	const variables: Record<string, Input<string>> = {}
	const logFormats = {
		text: 'Text',
		json: 'JSON',
	}

	const lambda = new aws.lambda.Function(
		group,
		'function',
		{
			functionName: name,
			description: name,
			role: role.arn,
			runtime: props.runtime,
			handler: props.handler,
			timeout: toSeconds(props.timeout ?? seconds(10)),
			memorySize: toMebibytes(props.memorySize ?? mebibytes(128)),
			architectures: [props.architecture ?? 'arm64'],

			timeouts: {
				create: '30s',
				update: '30s',
				delete: '30s',
			},

			s3Bucket: code.bucket,
			s3ObjectVersion: code.versionId,
			s3Key: code.key.pipe(name => {
				if (name.startsWith('/')) {
					return name.substring(1)
				}

				return name
			}),

			sourceCodeHash: sourceHash,

			environment: {
				variables,
			},

			vpcConfig: props.vpc
				? {
						securityGroupIds: [ctx.shared.get('vpc', 'security-group-id')],
						subnetIds: ctx.shared.get('vpc', 'private-subnets'),
						ipv6AllowedForDualStack: true,
					}
				: undefined,

			loggingConfig: {
				logGroup: `/aws/lambda/${name}`,
				logFormat: logFormats[props.log?.format ?? 'json'],
				applicationLogLevel: (props.log?.format ?? 'json') === 'json' ? props.log?.level?.toUpperCase() : undefined,
				systemLogLevel: (props.log?.format ?? 'json') === 'json' ? props.log?.system?.toUpperCase() : undefined,
			},
		},
		{
			dependsOn,
		}
	)

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId

	if ('stackConfig' in ctx) {
		variables.STACK = ctx.stackConfig.name
	}

	if (props.vpc) {
		// Tell all aws clients to use the dualstack endpoint when the
		// lambda runs inside the vpc.
		variables.AWS_USE_DUALSTACK_ENDPOINT = 'true'
	}

	// ------------------------------------------------------------
	// Logging

	const retention = props.log?.retention

	if (retention && retention.value > 0n) {
		const logGroup = new aws.cloudwatch.LogGroup(group, 'log', {
			name: `/aws/lambda/${name}`,
			retentionInDays: toDays(retention),
		})

		addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
		})

		if (ctx.shared.has('on-error-log', 'subscriber-arn')) {
			new aws.cloudwatch.LogSubscriptionFilter(group, 'on-error-log', {
				name: 'error-log-subscription',
				destinationArn: ctx.shared.get('on-error-log', 'subscriber-arn'),
				logGroupName: logGroup.name,
				filterPattern,
			})
		}
	}

	return {
		name,
		group,
		lambda,
		policy,
		code,
		setEnvironment(name: string, value: Input<string>) {
			variables[name] = value
		},
		addPermission(...permissions: Permission[]) {
			addPermission(...permissions)
		},
	}
}

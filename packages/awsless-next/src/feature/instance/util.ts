import { toDays, toSeconds } from '@awsless/duration'
import { $, Future, Group, Input, OptionalInput, resolveInputs } from '@awsless/formation'
import { toMebibytes } from '@awsless/size'
import { generateFileHash } from '@awsless/ts-file-cache'
import { constantCase, pascalCase } from 'change-case'
import deepmerge from 'deepmerge'
import { join } from 'path'
import { getBuildPath } from '../../build/index.js'
import { Permission, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { shortId } from '../../util/id.js'
import { formatLocalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { createTempFolder } from '../../util/temp.js'
import { formatFilterPattern, getGlobalOnLog } from '../on-log/util.js'
import { buildExecutable } from './build/executable.js'
import { InstanceProps } from './schema.js'

export const createFargateTask = (
	parentGroup: Group,
	ctx: StackContext,
	ns: string,
	id: string,
	local: InstanceProps
) => {
	const group = new Group(parentGroup, 'instance', ns)

	const name = formatLocalResourceName({
		appName: ctx.app.name,
		stackName: ctx.stack.name,
		resourceType: ns,
		resourceName: id,
	})

	const shortName = shortId(`${ctx.app.name}:${ctx.stack.name}:${ns}:${id}:${ctx.appId}`)

	const props = deepmerge(ctx.appConfig.defaults.instance, local)

	const image =
		props.image ||
		(props.architecture === 'arm64'
			? 'public.ecr.aws/aws-cli/aws-cli:arm64'
			: 'public.ecr.aws/aws-cli/aws-cli:amd64')

	// ------------------------------------------------------------

	ctx.registerBuild('instance', name, async (build, { workspace }) => {
		const fingerprint = await generateFileHash(workspace, local.code.file)

		return build(fingerprint, async write => {
			const temp = await createTempFolder(`instance--${name}`)
			const executable = await buildExecutable(local.code.file, temp.path, props.architecture)

			await Promise.all([
				//
				write('HASH', executable.hash),
				write('program', executable.file),
				temp.delete(),
			])

			return {
				size: formatByteSize(executable.file.byteLength),
			}
		})
	})

	const code = new $.aws.s3.BucketObject(group, 'code', {
		bucket: ctx.shared.get('instance', 'bucket-name'),
		key: name,
		source: relativePath(getBuildPath('instance', name, 'program')),
		sourceHash: $file(getBuildPath('instance', name, 'HASH')),
	})

	// ------------------------------------------------------------
	// Permissions

	const executionRole = new $.aws.iam.Role(group, 'execution-role', {
		name: shortId(`${shortName}:execution-role`),
		description: name,
		assumeRolePolicy: JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Action: 'sts:AssumeRole',
					Principal: {
						Service: ['ecs-tasks.amazonaws.com'],
					},
				},
			],
		}),
		managedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'],
	})

	const role = new $.aws.iam.Role(
		group,
		'task-role',
		{
			name: shortId(`${shortName}:task-role`),
			description: name,
			assumeRolePolicy: JSON.stringify({
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Action: 'sts:AssumeRole',
						Principal: {
							Service: ['ecs-tasks.amazonaws.com'],
						},
					},
				],
			}),
			inlinePolicy: [
				{
					name: 's3-code-access',
					policy: $resolve([code.bucket, code.key], (bucket, key) => {
						return JSON.stringify({
							Version: '2012-10-17',
							Statement: [
								{
									Effect: pascalCase('allow'),
									Action: ['s3:getObject', 's3:HeadObject'],
									Resource: `arn:aws:s3:::${bucket}/${key}`,
								},
							],
						})
					}),
				},
			],
		},
		{
			dependsOn: [code],
		}
	)

	const statements: Permission[] = []

	const policy = new $.aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'task-policy',
		policy: new Future(async resolve => {
			const list = await resolveInputs(statements)
			resolve(
				JSON.stringify({
					Version: '2012-10-17',
					Statement: list.map(statement => ({
						Effect: pascalCase(statement.effect ?? 'allow'),
						Action: statement.actions,
						Resource: statement.resources,
					})),
				})
			)
		}),
	})

	// const addPermission = (...permissions: Permission[]) => {
	// 	statements.push(...permissions)
	// 	policy.$.attachDependencies(permissions)
	// }

	ctx.onPermission(statement => {
		statements.push(statement)
		policy.$.attachDependencies(statement)
	})

	// ------------------------------------------------------------
	// Logging

	let logGroup: $.aws.cloudwatch.LogGroup | undefined
	if (props.log.retention && props.log.retention.value > 0n) {
		logGroup = new $.aws.cloudwatch.LogGroup(group, 'log', {
			// name: `/aws/ecs/${name}`,
			name: `/aws/lambda/${name}`,
			retentionInDays: toDays(props.log.retention),
		})

		// ------------------------------------------------------------
		// Add log subscription

		const onLogArn = getGlobalOnLog(ctx)

		if (onLogArn && ctx.appConfig.defaults.onLog) {
			const logFilter = ctx.appConfig.defaults.onLog.filter

			new $.aws.cloudwatch.LogSubscriptionFilter(group, `on-log`, {
				name: 'log-subscription',
				destinationArn: onLogArn,
				logGroupName: logGroup.name,
				filterPattern: formatFilterPattern(logFilter),
			})
		}
	}

	// ------------------------------------------------------------

	const tags = {
		APP: ctx.appConfig.name,
		APP_ID: ctx.appId,
		STACK: ctx.stackConfig.name,
	}

	const variables: Record<string, Input<string> | OptionalInput<string>> = {}

	const task = new $.aws.ecs.TaskDefinition(
		group,
		'task',
		{
			family: name,
			networkMode: 'awsvpc',
			cpu: props.cpu,
			memory: toMebibytes(props.memorySize).toString(),
			requiresCompatibilities: ['FARGATE'],
			executionRoleArn: executionRole.arn,
			taskRoleArn: role.arn,
			runtimePlatform: {
				cpuArchitecture: constantCase(props.architecture),
				operatingSystemFamily: 'LINUX',
			},
			trackLatest: true,
			containerDefinitions: new Future<string>(async resolve => {
				const data = await resolveInputs(variables)

				const { s3Bucket, s3Key } = await resolveInputs({
					s3Bucket: code.bucket,
					s3Key: code.key,
				})

				resolve(
					JSON.stringify([
						{
							name: `container-${id}`,
							essential: true,
							image,
							protocol: 'tcp',
							workingDirectory: '/usr/app',
							entryPoint: ['sh', '-c'],
							command: [
								[
									`aws s3 cp s3://${s3Bucket}/${s3Key} /usr/app/program`,
									`chmod +x /usr/app/program`,
									`/usr/app/program`,
								].join(' && '),
							],

							environment: Object.entries(data).map(([name, value]) => ({
								name,
								value,
							})),

							portMappings: [
								{
									name: 'http',
									protocol: 'tcp',
									appProtocol: 'http',
									containerPort: 80,
									hostPort: 80,
								},
							],

							restartPolicy: {
								enabled: true,
								restartAttemptPeriod: 60,
							},

							...(logGroup && {
								logConfiguration: {
									logDriver: 'awslogs',
									options: {
										// 'awslogs-group': `/aws/ecs/${name}`,
										'awslogs-group': `/aws/lambda/${name}`,
										'awslogs-region': ctx.appConfig.region,
										'awslogs-stream-prefix': 'ecs',
										// mode: 'non-blocking',
										// 'max-buffer-size': '1m',
									},
								},
							}),

							healthCheck: props.healthCheck
								? {
										command: [
											'CMD-SHELL',
											`curl -f http://${join('localhost', props.healthCheck.path)} || exit 1`,
										],
										interval: toSeconds(props.healthCheck.interval),
										retries: props.healthCheck.retries,
										startPeriod: toSeconds(props.healthCheck.startPeriod),
										timeout: toSeconds(props.healthCheck.timeout),
									}
								: undefined,
						},
					])
				)
			}),

			tags,
		},
		{
			replaceOnChanges: [
				'containerDefinitions',
				'cpu',
				'memory',
				'runtimePlatform',
				'executionRoleArn',
				'taskRoleArn',
			],
			dependsOn: [code],
		}
	)

	const securityGroup = new $.aws.security.Group(group, 'security-group', {
		name: name,
		description: 'Security group for the instance',
		vpcId: ctx.shared.get('vpc', 'id'),
		revokeRulesOnDelete: true,
		tags,
	})

	new $.aws.vpc.SecurityGroupIngressRule(group, 'ingress-rule-http', {
		securityGroupId: securityGroup.id,
		description: `Allow HTTP traffic on port 80 to the ${name} instance`,
		fromPort: 80,
		toPort: 80,
		ipProtocol: 'tcp',
		cidrIpv4: '0.0.0.0/0',
		tags,
	})

	new $.aws.vpc.SecurityGroupEgressRule(group, 'egress-rule', {
		securityGroupId: securityGroup.id,
		description: `Allow all outbound traffic from the ${name} instance`,
		ipProtocol: '-1',
		cidrIpv4: '0.0.0.0/0',
		tags,
	})

	const service = new $.aws.ecs.Service(group, 'service', {
		name: name,
		cluster: ctx.shared.get('instance', 'cluster-arn'),
		taskDefinition: task.arn,
		desiredCount: 1,
		launchType: 'FARGATE',
		networkConfiguration: {
			subnets: ctx.shared.get('vpc', 'public-subnets'),
			securityGroups: [securityGroup.id],
			assignPublicIp: true, // https://stackoverflow.com/questions/76398247/cannotpullcontainererror-pull-image-manifest-has-been-retried-5-times-failed
		},

		forceNewDeployment: true,
		forceDelete: true,

		// deploymentCircuitBreaker: {
		// 	enable: true,
		// 	rollback: true,
		// },
		// deploymentController: { type: 'ECS' },

		tags,
	})

	// ------------------------------------------------------------

	ctx.onEnv((name, value) => {
		variables[name] = value
		task.$.attachDependencies(value)
	})

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId
	variables.STACK = ctx.stackConfig.name
	variables.CODE_HASH = code.sourceHash // needed to force update on code change

	// ------------------------------------------------------------
	// Add user defined permissions

	if (ctx.appConfig.defaults.instance.permissions) {
		statements.push(...ctx.appConfig.defaults.instance.permissions)
	}

	if ('permissions' in local && local.permissions) {
		statements.push(...local.permissions)
	}

	return { name, task, service, policy, code, group }
}

import { toDays, toSeconds } from '@awsless/duration'
import { $, Future, Group, Input, OptionalInput, resolveInputs } from '@awsless/formation'
import { generateFileHash } from '@awsless/ts-file-cache'
import { constantCase, pascalCase } from 'change-case'
import deepmerge from 'deepmerge'
import { basename } from 'path'
import { getBuildPath } from '../../build/index.js'
import { Permission, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { generateCacheKey } from '../../util/cache.js'
import { shortId } from '../../util/id.js'
import { formatLocalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { createTempFolder } from '../../util/temp.js'
import { zipBundle } from '../function/build/bundle/bundle.js'
import { bundleTypeScript } from '../function/build/typescript/bundle.js'
import { zipFiles } from '../function/build/zip.js'
import { formatFilterPattern, getGlobalOnLog } from '../on-log/util.js'
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

	// ------------------------------------------------------------

	let code: $.aws.s3.BucketObject

	if ('file' in local.code) {
		const fileCode = local.code
		ctx.registerBuild('instance', name, async (build, { workspace }) => {
			const fingerprint = await generateFileHash(workspace, fileCode.file)

			return build(fingerprint, async write => {
				const temp = await createTempFolder(`instance--${name}`)

				const bundle = await bundleTypeScript({
					file: fileCode.file,
					external: [...(fileCode.external ?? [])],
					minify: fileCode.minify,
					nativeDir: temp.path,
				})

				const nativeFiles = await temp.files()
				const archive = await zipFiles([
					...bundle.files,
					...nativeFiles.map(file => ({
						name: basename(file),
						path: file,
					})),
				])

				await Promise.all([
					write('HASH', bundle.hash),
					write('bundle.zip', archive),
					...bundle.files.map(file => write(`files/${file.name}`, file.code)),
					...bundle.files.map(file => file.map && write(`files/${file.name}.map`, file.map)),
				])

				await temp.delete()

				return {
					size: formatByteSize(archive.byteLength),
				}
			})
		})

		code = new $.aws.s3.BucketObject(group, 'code', {
			bucket: ctx.shared.get('instance', 'bucket-name'),
			key: `/fargate/${name}.zip`,
			source: relativePath(getBuildPath('instance', name, 'bundle.zip')),
			sourceHash: $hash(getBuildPath('instance', name, 'HASH')),
		})
	} else {
		const bundleCode = local.code
		ctx.registerBuild('instance', name, async build => {
			const fingerprint = await generateCacheKey([bundleCode.bundle])

			return build(fingerprint, async write => {
				const bundle = await zipBundle({
					directory: bundleCode.bundle,
				})

				await write('HASH', fingerprint)
				await write('bundle.zip', bundle)

				return {
					size: formatByteSize(bundle.byteLength),
				}
			})
		})

		code = new $.aws.s3.BucketObject(group, 'code', {
			bucket: ctx.shared.get('instance', 'bucket-name'),
			key: `fargate/${name}.zip`,
			source: relativePath(getBuildPath('instance', name, 'bundle.zip')),
			sourceHash: $hash(getBuildPath('instance', name, 'HASH')),
		})
	}

	const s3Bucket = code.bucket
	const s3Key = code.key.pipe(name => {
		if (name.startsWith('/')) {
			return name.substring(1)
		}

		return name
	})

	// ------------------------------------------------------------

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

	// ------------------------------------------------------------

	const role = new $.aws.iam.Role(group, 'task-role', {
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
		managedPolicyArns: ['arn:aws:iam::aws:policy/AmazonS3FullAccess'],
		// inlinePolicy: [
		// 	{
		// 		name: 'instance-asset-access',
		// 		policy: JSON.stringify({
		// 			Version: '2012-10-17',
		// 			Statement: [
		// 				{
		// 					Effect: pascalCase('allow'),
		// 					Action: 's3:getObject',
		// 					Resoure: `${s3Bucket}/${s3Key}`,
		// 				},
		// 			],
		// 		}),
		// 	},
		// ],
	})

	const statements: Permission[] = [
		{
			effect: 'allow',
			actions: ['s3:getObject'],
			resources: [`arn:aws:s3:::${s3Bucket}/${s3Key}`],
		},
	]

	const addPermission = (...permissions: Permission[]) => {
		statements.push(...permissions)
		policy.$.attachDependencies(permissions)
	}

	ctx.onPermission(statement => {
		addPermission(statement)
	})

	const policy = new $.aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'fargate-task-policy',
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

	// ------------------------------------------------------------
	// VPC

	// let dependsOn: Resource<any, any>[] = []

	// dependsOn.push(
	// 	new $.aws.iam.RolePolicy(group, 'vpc-policy', {
	// 		role: role.name,
	// 		name: 'fargate-task-vpc-policy',
	// 		policy: JSON.stringify({
	// 			Version: '2012-10-17',
	// 			Statement: [
	// 				{
	// 					Effect: 'Allow',
	// 					Action: [
	// 						'ec2:CreateNetworkInterface',
	// 						'ec2:DescribeNetworkInterfaces',
	// 						'ec2:DeleteNetworkInterface',
	// 						'ec2:AssignPrivateIpAddresses',
	// 						'ec2:UnassignPrivateIpAddresses',
	// 					],
	// 					Resource: ['*'],
	// 				},
	// 			],
	// 		}),
	// 	})
	// )

	// ------------------------------------------------------------
	// Logging

	let logGroup: $.aws.cloudwatch.LogGroup | undefined
	if (props.log.retention!.value > 0n) {
		logGroup = new $.aws.cloudwatch.LogGroup(group, 'log', {
			name: `/aws/ecs/${name}`,
			retentionInDays: toDays(props.log.retention),
		})

		addPermission({
			actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
			resources: [logGroup.arn.pipe(arn => `${arn}:*`)],
		})

		// ------------------------------------------------------------
		// Add Log subscription

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

	const variables: Record<string, Input<string> | OptionalInput<string>> = {}

	const task = new $.aws.ecs.TaskDefinition(
		group,
		'task',
		{
			family: name,
			networkMode: 'awsvpc',
			cpu: '512', // props.cpuSize,
			memory: '1024', // props.memorySize,
			requiresCompatibilities: ['FARGATE'],
			executionRoleArn: executionRole.arn,
			taskRoleArn: executionRole.arn,
			trackLatest: true,

			// runtimePlatform: {
			// 	cpuArchitecture: constantCase(props.architecture),
			// 	operatingSystemFamily: 'LINUX',
			// },

			containerDefinitions: JSON.stringify([
				{
					name: 'container',
					image: 'public.ecr.aws/d7g8v4v5/nodejs/server',
					essential: true,
					// environment: variables,
					portMappings: [
						{
							containerPort: 81,
							hostPort: 81,
							protocol: 'tcp',
						},
					],
					// ...(logGroup && {
					// 	logConfiguration: {
					// 		logDriver: 'awslogs',
					// 		options: {
					// 			'awslogs-group': logGroup.name,
					// 			'awslogs-region': ctx.appConfig.region,
					// 			// mode: 'non-blocking',
					// 			// 'max-buffer-size': '1m',
					// 		},
					// 	},
					// }),
					// healthCheck: props.healthCheck
					// 	? {
					// 			command: props.healthCheck.command,
					// 			interval: toSeconds(props.healthCheck.interval),
					// 			retries: props.healthCheck.retries,
					// 			startPeriod: toSeconds(props.healthCheck.startPeriod),
					// 			timeout: toSeconds(props.healthCheck.timeout),
					// 		}
					// 	: undefined,
				},
			]),
		}
		// {
		// 	dependsOn,
		// }
	)

	const tags = {
		APP: ctx.appConfig.name,
		APP_ID: ctx.appId,
		STACK: ctx.stackConfig.name,
	}

	const securityGroup = new $.aws.security.Group(group, 'security-group', {
		name: name,
		description: 'Security group for the instance',
		vpcId: ctx.shared.get('vpc', 'id'),
		tags,
	})

	new $.aws.vpc.SecurityGroupIngressRule(group, 'ingress-rule', {
		securityGroupId: securityGroup.id,
		description: `Allow HTTP traffic on port 3000 to the ${name} instance`,
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
		cluster: ctx.shared.get('instance', 'cluster-arn'),
		name: name,
		taskDefinition: task.arn,
		desiredCount: 1,
		launchType: 'FARGATE',
		networkConfiguration: {
			subnets: ctx.shared.get('vpc', 'public-subnets'),
			securityGroups: [securityGroup.id],
			assignPublicIp: true,
		},
		tags,
	})

	// ------------------------------------------------------------

	ctx.onEnv((name, value) => {
		variables[name] = value
		task.$.attachDependencies({ value })
	})

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId
	variables.STACK = ctx.stackConfig.name
	variables.S3_BUCKET = s3Bucket
	variables.S3_KEY = s3Key
	variables.CODE_HASH = code.sourceHash

	// ------------------------------------------------------------
	// Permissions

	if (ctx.appConfig.defaults.function.permissions) {
		statements.push(...ctx.appConfig.defaults.function.permissions)
	}

	if ('permissions' in local && local.permissions) {
		statements.push(...local.permissions)
	}

	return {
		name,
		task,
		service,
		policy,
		code,
		group,
		setEnvironment(name: string, value: Input<string>) {
			variables[name] = value
		},
		addPermission(statement: Permission) {
			addPermission(statement)
		},
	}
}

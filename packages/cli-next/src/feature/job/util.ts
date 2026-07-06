import { createHash } from 'crypto'
import { toDays, toSeconds } from '@awsless/duration'
import { stringify } from '@awsless/json'
import { toMebibytes } from '@awsless/size'
import { generateFileHash } from '@awsless/ts-file-cache'
import { aws } from '@terraforge/aws'
import { Group, Input, OptionalInput, Output, findInputDeps, resolveInputs } from '@terraforge/core'
import { constantCase, pascalCase } from 'change-case'
import deepmerge from 'deepmerge'
import { getBuildPath } from '../../build/index.js'
import { Permission, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { shortId } from '../../util/id.js'
import { formatLocalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { createTempFolder } from '../../util/temp.js'
import { filterPattern } from '../on-error-log/util.js'
import { buildJobExecutable } from './build/executable.js'
import { JobProps } from './schema.js'

export const createFargateJob = (parentGroup: Group, ctx: StackContext, ns: string, id: string, local: JobProps) => {
	const group = new Group(parentGroup, 'job', ns)

	const name = formatLocalResourceName({
		appName: ctx.app.name,
		stackName: ctx.stack.name,
		resourceType: ns,
		resourceName: id,
	})

	const shortName = shortId(`${ctx.app.name}:${ctx.stack.name}:${ns}:${id}:${ctx.appId}`)

	const props = deepmerge(ctx.appConfig.defaults.job, local)
	const image =
		props.image ||
		(props.architecture === 'arm64'
			? 'public.ecr.aws/aws-cli/aws-cli:arm64'
			: 'public.ecr.aws/aws-cli/aws-cli:amd64')

	// ------------------------------------------------------------

	ctx.registerBuild('job', name, async (build, { workspace }) => {
		const fingerprint = [await generateFileHash(workspace, local.code.file), props.architecture].join(':')

		return build(fingerprint, async write => {
			const temp = await createTempFolder(`job--${name}`)
			const executable = await buildJobExecutable(local.code.file, temp.path, props.architecture)

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

	const code = new aws.s3.BucketObject(group, 'code', {
		bucket: ctx.shared.get('job', 'bucket-name'),
		key: name,
		source: relativePath(getBuildPath('job', name, 'program')),
		sourceHash: $file(getBuildPath('job', name, 'HASH')),
	})

	// ------------------------------------------------------------
	// Permissions

	const executionRole = new aws.iam.Role(group, 'execution-role', {
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

	const role = new aws.iam.Role(
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
									Action: ['s3:GetObject', 's3:HeadObject'],
									Resource: [`arn:aws:s3:::${bucket}/${key}`, `arn:aws:s3:::${bucket}/payloads/*`],
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
	const statementDeps: Set<any> = new Set()

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'task-policy',
		policy: new Output(statementDeps, async (resolve: (value: string) => void) => {
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

	const addPermission = (...permissions: Permission[]) => {
		statements.push(...permissions)
		for (const dep of findInputDeps(permissions)) {
			statementDeps.add(dep)
		}
	}

	ctx.onPermission(statement => {
		addPermission(statement)
	})

	// ------------------------------------------------------------
	// Logging

	let logGroup: aws.cloudwatch.LogGroup | undefined
	if (props.log.retention && props.log.retention.value > 0n) {
		logGroup = new aws.cloudwatch.LogGroup(group, 'log', {
			name: `/aws/ecs/${name}`,
			retentionInDays: toDays(props.log.retention),
		})

		// ------------------------------------------------------------
		// Add log subscription

		if (ctx.shared.has('on-error-log', 'subscriber-arn')) {
			new aws.cloudwatch.LogSubscriptionFilter(group, 'on-error-log', {
				name: 'error-log-subscription',
				destinationArn: ctx.shared.get('on-error-log', 'subscriber-arn'),
				logGroupName: logGroup.name,
				filterPattern,
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
	const variableDeps: Set<any> = new Set()
	const taskDependsOn: any[] = [code]

	const accessPoint = props.persistentStorage
		? (() => {
				const fileSystemId = ctx.shared.get('job', 'persistent-storage-file-system-id')

				const accessPoint = new aws.efs.AccessPoint(
					group,
					'access-point',
					{
						fileSystemId,
						rootDirectory: {
							path: `/jobs/${name}`,
							creationInfo: {
								ownerUid: 0,
								ownerGid: 0,
								permissions: '755',
							},
						},
						tags,
					},
					{
						replaceOnChanges: ['fileSystemId'],
					}
				)

				taskDependsOn.push(accessPoint)

				return {
					accessPoint,
					fileSystemId,
				}
			})()
		: undefined

	const task = new aws.ecs.TaskDefinition(
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
			...(accessPoint && {
				volume: [
					{
						name: 'persistent-storage',
						efsVolumeConfiguration: {
							fileSystemId: accessPoint.fileSystemId,
							transitEncryption: 'ENABLED',
							authorizationConfig: {
								accessPointId: accessPoint.accessPoint.id,
							},
						},
					},
				],
			}),
			containerDefinitions: new Output<string>(variableDeps, async (resolve: (value: string) => void) => {
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
							workingDirectory: '/usr/app',
							entryPoint: ['sh', '-c'],
							command: [
								[
									...(props.startupCommand?.length
										? [props.startupCommand.join(' && ')]
										: []),
									`if [ "$(cat /root/.code-hash 2>/dev/null)" != "$CODE_HASH" ]; then command -v aws >/dev/null 2>&1 || dnf install -y awscli && aws s3 cp s3://${s3Bucket}/${s3Key} /root/program.tmp && mv /root/program.tmp /root/program && chmod +x /root/program && echo "$CODE_HASH" > /root/.code-hash; fi`,
									`exec timeout --kill-after=10 ${toSeconds(props.timeout)} /root/program`,
								].join(' && '),
							],

							environment: Object.entries(data).map(([name, value]) => ({
								name,
								value,
							})),
							...(accessPoint && {
								mountPoints: [
									{
										sourceVolume: 'persistent-storage',
										containerPath: '/root',
									},
								],
							}),

							...(logGroup && {
								logConfiguration: {
									logDriver: 'awslogs',
									options: {
										'awslogs-group': `/aws/ecs/${name}`,
										'awslogs-region': ctx.appConfig.region,
										'awslogs-stream-prefix': 'ecs',
										mode: 'non-blocking',
									},
								},
							}),
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
			dependsOn: taskDependsOn,
		}
	)

	// ------------------------------------------------------------

	ctx.onEnv((name, value) => {
		variables[name] = value
		for (const dep of findInputDeps([value])) {
			variableDeps.add(dep)
		}
	})

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId
	variables.STACK = ctx.stackConfig.name
	variables.CODE_HASH = code.sourceHash // needed to force update on code change
	variables.JOB_CONFIG_HASH = createHash('sha1').update(stringify(props)).digest('hex') // needed to force update on config change

	// Add user-defined environment variables
	if (props.environment) {
		for (const [key, value] of Object.entries(props.environment)) {
			variables[key] = value
		}
	}

	// ------------------------------------------------------------
	// Add user defined permissions

	if (ctx.appConfig.defaults.job.permissions) {
		statements.push(...ctx.appConfig.defaults.job.permissions)
	}

	if ('permissions' in local && local.permissions) {
		statements.push(...local.permissions)
	}

	return { name, task, policy, code, group }
}

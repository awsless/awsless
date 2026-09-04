import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'path'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, OptionalInput, Output, resolveInputs } from '@terraforge/core'
import { getBuildPath } from '../../build/index.js'
import { AppContext, Permission } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { formatPolicyDocument } from '../../util/policy.js'
import { createTempFolder } from '../../util/temp.js'
import { PolicyStatement } from '../bundle/policy.js'
import { buildExecutable } from '../instance/build/executable.js'
import { createLogGroup } from '../on-error-log/util.js'
import { PubSubDefaultProps } from './schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The pubsub server needs no manual sizing config.
// Capacity is handled by the autoscaling policy.
export const WS_PORT = 3000
const ARCHITECTURE = 'arm64'
const CPU = '256'
const MEMORY = '512'
const MIN_CAPACITY = 1
const MAX_CAPACITY = 10

// The server is a prebuilt program that only talks to the bundle, sns &
// redis, so it receives its own env & grants instead of the app wide ones.
export const createPubSubService = (
	parentGroup: Group,
	ctx: AppContext,
	id: string,
	props: PubSubDefaultProps,
	inputs: {
		clusterName: Input<string>
		clusterArn: Input<string>
		targetGroupArn: Input<string>
		securityGroupId: Input<string>
		environment: Record<string, Input<string>>
	}
) => {
	const group = new Group(parentGroup, 'service', id)

	const name = formatGlobalResourceName({
		appName: ctx.app.name,
		resourceType: 'pubsub',
		resourceName: id,
	})

	const shortName = shortId(`${ctx.app.name}:pubsub:${id}:${ctx.appId}`)

	const image = 'public.ecr.aws/aws-cli/aws-cli:arm64'

	// ------------------------------------------------------------
	// Compile the prebuilt server bundle into a bun executable

	const bundleFile = join(__dirname, 'handlers/pubsub-server.js')

	ctx.registerBuild('pubsub', name, async build => {
		const hash = createHash('sha1')
			.update(await readFile(bundleFile))
			.digest('hex')
		const fingerprint = `${hash}-${ARCHITECTURE}`

		return build(fingerprint, async write => {
			await using temp = await createTempFolder(`pubsub--${name}`)

			const executable = await buildExecutable(bundleFile, temp.path, ARCHITECTURE)

			await Promise.all([
				//
				write('HASH', executable.hash),
				write('program', executable.file),
			])

			return {
				size: formatByteSize(executable.file.byteLength),
			}
		})
	})

	const code = new aws.s3.BucketObject(
		group,
		'code',
		{
			bucket: ctx.shared.get('asset', 'bucket').name,
			key: `pubsub/${name}`,
			source: relativePath(getBuildPath('pubsub', name, 'program')),
			sourceHash: $file(getBuildPath('pubsub', name, 'HASH')),
		},
		{
			replaceOnChanges: ['bucket', 'key'],
		}
	)

	// ------------------------------------------------------------
	// Permissions

	const executionRole = new aws.iam.Role(
		group,
		'execution-role',
		{
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
		},
		{
			import: ctx.import ? shortId(`${shortName}:execution-role`) : undefined,
		}
	)

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
									Effect: 'Allow',
									Action: ['s3:GetObject'],
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
			import: ctx.import ? shortId(`${shortName}:task-role`) : undefined,
		}
	)

	const statements: Permission[] = []
	const statementDeps: Set<any> = new Set()

	const policy = new aws.iam.RolePolicy(group, 'policy', {
		role: role.name,
		name: 'task-policy',
		policy: new Output(statementDeps, async (resolve: (value: string) => void) => {
			const list = (await resolveInputs(statements)) as PolicyStatement[]
			resolve(formatPolicyDocument(list))
		}),
	})

	const addPermission = (...permissions: Permission[]) => {
		statements.push(...permissions)
		for (const dep of findInputDeps(permissions)) {
			statementDeps.add(dep)
		}
	}

	// ------------------------------------------------------------
	// Logging

	const logGroup = createLogGroup(group, ctx, {
		name: `/aws/ecs/${name}`,
		retention: props.log.retention,
	})

	// ------------------------------------------------------------

	const tags = {
		APP: ctx.appConfig.name,
		APP_ID: ctx.appId,
	}

	const variables: Record<string, Input<string> | OptionalInput<string>> = {}
	const variableDeps: Set<any> = new Set()

	const task = new aws.ecs.TaskDefinition(
		group,
		'task',
		{
			family: name,
			networkMode: 'awsvpc',
			cpu: CPU,
			memory: MEMORY,
			requiresCompatibilities: ['FARGATE'],
			executionRoleArn: executionRole.arn,
			taskRoleArn: role.arn,
			runtimePlatform: {
				cpuArchitecture: 'ARM64',
				operatingSystemFamily: 'LINUX',
			},
			trackLatest: true,
			containerDefinitions: new Output<string>(variableDeps, async (resolve: (value: string) => void) => {
				const data = await resolveInputs(variables)

				const { s3Bucket, s3Key } = (await resolveInputs({
					s3Bucket: code.bucket,
					s3Key: code.key,
				})) as unknown as { s3Bucket: string; s3Key: string }

				resolve(
					JSON.stringify([
						{
							name: `container-${id}`,
							essential: true,
							image,
							protocol: 'tcp',
							workingDirectory: '/usr/app',
							entryPoint: ['sh', '-c'],
							// Reuse the downloaded program until its code hash changes.
							command: [
								`if [ "$(cat /usr/app/.code-hash 2>/dev/null)" != "$CODE_HASH" ]; then
	command -v aws >/dev/null 2>&1 || dnf install -y awscli &&
	aws s3 cp s3://${s3Bucket}/${s3Key} /usr/app/program.tmp &&
	mv /usr/app/program.tmp /usr/app/program &&
	chmod +x /usr/app/program &&
	echo "$CODE_HASH" > /usr/app/.code-hash
fi &&
exec /usr/app/program`,
							],

							environment: Object.entries(data).map(([name, value]) => ({
								name,
								value,
							})),

							portMappings: [
								{
									name: 'ws',
									protocol: 'tcp',
									appProtocol: 'http',
									containerPort: WS_PORT,
									hostPort: WS_PORT,
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
			dependsOn: [code],
		}
	)

	const service = new aws.ecs.Service(
		group,
		'service',
		{
			name: name,
			cluster: inputs.clusterArn,
			taskDefinition: task.arn,
			launchType: 'FARGATE',
			networkConfiguration: {
				subnets: ctx.shared.get('vpc', 'private-subnets'),
				securityGroups: [inputs.securityGroupId],
				assignPublicIp: false,
			},

			loadBalancer: [
				{
					containerName: `container-${id}`,
					containerPort: WS_PORT,
					targetGroupArn: inputs.targetGroupArn,
				},
			],
			healthCheckGracePeriodSeconds: 30,

			forceNewDeployment: true,
			forceDelete: true,
			tags,

			// ------------------------------------------------------------
			// Zero-downtime deploys: spin up the new tasks before the old
			// ones are drained.
			// The desired count is intentionally not set, so that deploys
			// never reset the capacity the autoscaler picked.
			schedulingStrategy: 'REPLICA',
			deploymentMaximumPercent: 200,
			deploymentMinimumHealthyPercent: 100,
			deploymentCircuitBreaker: {
				enable: true,
				rollback: true,
			},

			// ------------------------------------------------------------
			// Tag hygiene: let ECS manage and propagate runtime tags automatically.
			enableEcsManagedTags: true,
			propagateTags: 'SERVICE',
		},
		{
			replaceOnChanges: ['cluster'],
		}
	)

	const target = new aws.appautoscaling.Target(
		group,
		'autoscaling-target',
		{
			serviceNamespace: 'ecs',
			scalableDimension: 'ecs:service:DesiredCount',
			minCapacity: MIN_CAPACITY,
			maxCapacity: MAX_CAPACITY,
			resourceId: $resolve([inputs.clusterName, service.name], (clusterName: string, serviceName: string) => {
				return `service/${clusterName}/${serviceName}`
			}),
			tags,
		},
		{
			dependsOn: [service],
		}
	)

	new aws.appautoscaling.Policy(
		group,
		'autoscaling-policy',
		{
			name: `${name}-cpu`,
			policyType: 'TargetTrackingScaling',
			serviceNamespace: target.serviceNamespace,
			scalableDimension: target.scalableDimension,
			resourceId: target.resourceId,
			targetTrackingScalingPolicyConfiguration: {
				predefinedMetricSpecification: {
					predefinedMetricType: 'ECSServiceAverageCPUUtilization',
				},
				targetValue: 70,
				scaleInCooldown: 300,
				scaleOutCooldown: 60,
			},
		},
		{
			dependsOn: [target],
		}
	)

	// ------------------------------------------------------------
	// Env Vars

	variables.APP = ctx.appConfig.name
	variables.APP_ID = ctx.appId
	variables.AWS_ACCOUNT_ID = ctx.accountId
	// The bootstrap compares it against the persisted program.
	variables.CODE_HASH = code.sourceHash

	for (const [key, value] of Object.entries(inputs.environment)) {
		variables[key] = value
		for (const dep of findInputDeps([value])) {
			variableDeps.add(dep)
		}
	}

	return { name, task, service, policy, code, group, addPermission }
}

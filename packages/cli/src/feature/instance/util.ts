import { join } from 'path'
import { toSeconds } from '@awsless/duration'
import { toMebibytes } from '@awsless/size'
import { generateFileHash } from '@awsless/ts-file-cache'
import { aws } from '@terraforge/aws'
import { findInputDeps, Group, Input, OptionalInput, Output, resolveInputs } from '@terraforge/core'
import { constantCase } from 'change-case'
import deepmerge from 'deepmerge'
import { getBuildPath } from '../../build/index.js'
import { Permission, StackContext } from '../../feature.js'
import { formatByteSize } from '../../util/byte-size.js'
import { shortId } from '../../util/id.js'
import { formatLocalResourceName } from '../../util/name.js'
import { relativePath } from '../../util/path.js'
import { formatPolicyDocument } from '../../util/policy.js'
import { createTempFolder } from '../../util/temp.js'
import { getFeatureFolder } from '../asset/index.js'
import { PolicyStatement } from '../bundle/policy.js'
import { createLogGroup } from '../on-error-log/util.js'
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

	const props = deepmerge(ctx.appConfig.instance, local)

	const image =
		props.image ||
		(props.architecture === 'arm64'
			? 'public.ecr.aws/aws-cli/aws-cli:arm64'
			: 'public.ecr.aws/aws-cli/aws-cli:amd64')

	// ------------------------------------------------------------

	ctx.registerBuild('instance', name, async (build, { workspace }) => {
		// The binary is compiled per target, so a cached build must not
		// survive an architecture switch.
		const fingerprint = [await generateFileHash(workspace, local.code.file), props.architecture].join(':')

		return build(fingerprint, async write => {
			await using temp = await createTempFolder(`instance--${name}`)

			const executable = await buildExecutable(local.code.file, temp.path, props.architecture)

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
			key: `${getFeatureFolder('instance', ctx.stack.name, id)}code`,
			source: relativePath(getBuildPath('instance', name, 'program')),
			sourceHash: $file(getBuildPath('instance', name, 'HASH')),
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

	ctx.onPermission(statement => {
		addPermission(statement)
	})

	ctx.shared.add('function', 'role', name, role)

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
		STACK: ctx.stackConfig.name,
	}

	const variables: Record<string, Input<string> | OptionalInput<string>> = {}
	const variableDeps: Set<any> = new Set()

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
								`${props.startupCommand?.length ? props.startupCommand.join(' && ') + ' &&' : ''}
if [ "$(cat /usr/app/.code-hash 2>/dev/null)" != "$CODE_HASH" ]; then
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
										'awslogs-group': `/aws/ecs/${name}`,
										'awslogs-region': ctx.appConfig.region,
										'awslogs-stream-prefix': 'ecs',
										mode: 'non-blocking',
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

	const securityGroup = new aws.security.Group(group, 'security-group', {
		name: name,
		description: 'Security group for the instance',
		vpcId: ctx.shared.get('vpc', 'id'),
		revokeRulesOnDelete: true,
		tags,
	})

	new aws.vpc.SecurityGroupEgressRule(group, 'egress-rule', {
		securityGroupId: securityGroup.id,
		description: `Allow all outbound traffic from the ${name} instance`,
		ipProtocol: '-1',
		cidrIpv4: '0.0.0.0/0',
		tags,
	})

	// The caches open their ingress to every registered instance.
	ctx.shared.add('instance', 'security-group-id', name, { name, id: securityGroup.id })

	const clusterName = ctx.shared.get('instance', 'cluster-name')
	const clusterArn = ctx.shared.get('instance', 'cluster-arn')

	const service = new aws.ecs.Service(
		group,
		'service',
		{
			name: name,
			cluster: clusterArn,
			taskDefinition: task.arn,
			desiredCount: 1,
			launchType: 'FARGATE',
			networkConfiguration: {
				subnets: ctx.shared.get('vpc', 'private-subnets'),
				securityGroups: [securityGroup.id],
				assignPublicIp: false,
			},

			forceNewDeployment: true,
			forceDelete: true,
			tags,

			// ------------------------------------------------------------
			// Deployment safeguards: keep the service pinned to one running task.
			schedulingStrategy: 'REPLICA',
			deploymentMaximumPercent: 100,
			deploymentMinimumHealthyPercent: 0,
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

	new aws.appautoscaling.Target(
		group,
		'autoscaling-target',
		{
			serviceNamespace: 'ecs',
			scalableDimension: 'ecs:service:DesiredCount',
			minCapacity: 1,
			maxCapacity: 1,
			resourceId: $resolve([clusterName, service.name], (clusterName: string, serviceName: string) => {
				return `service/${clusterName}/${serviceName}`
			}),
			tags,
		},
		{
			dependsOn: [service],
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
	// The bootstrap compares it against the persisted program.
	variables.CODE_HASH = code.sourceHash

	if (props.environment) {
		for (const [key, value] of Object.entries(props.environment)) {
			variables[key] = value
		}
	}

	addPermission(...(ctx.appConfig.instance.permissions ?? []), ...(local.permissions ?? []))

	return { name, task, service, policy, code, group, addPermission }
}

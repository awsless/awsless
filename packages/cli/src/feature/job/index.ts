import { relative } from 'path'
import { aws } from '@terraforge/aws'
import { Group, Output, resolveInputs, findInputDeps } from '@terraforge/core'
import { camelCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { funcType, invokeTypes, testMockTypes, writeResourceTypes } from '../../type-gen/snippets.js'
import { formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { createFargateJob } from './util.js'

const typeGenCode = `
import type { Mock } from 'vitest'

${funcType}
${invokeTypes({ returns: 'Promise<{ taskArn: string | undefined }>' })}${testMockTypes()}`

export const jobFeature = defineFeature({
	name: 'job',
	async onTypeGen(ctx) {
		await writeResourceTypes(ctx, {
			kind: 'job',
			interfaceName: 'JobResources',
			code: typeGenCode,
			stacks(stack, add, types) {
				for (const [name, props] of Object.entries(stack.jobs || {})) {
					const varName = camelCase(`${stack.name}-${name}`)
					const funcName = formatLocalResourceName({
						appName: ctx.appConfig.name,
						stackName: stack.name,
						resourceType: 'job',
						resourceName: name,
					})

					types.addImport(varName, relative(directories.types, props.code.file))
					add(name, `Invoke<'${funcName}', typeof ${varName}>`, `TestMockEntry<typeof ${varName}>`)
				}
			},
		})
	},
	onApp(ctx) {
		const found = ctx.stackConfigs.filter(stack => {
			return Object.keys(stack.jobs ?? {}).length > 0
		})

		if (found.length === 0) {
			return
		}

		// The job payloads only need to live for the duration of a job run.
		ctx.shared.get('asset', 'bucket').addLifecycleRule({
			id: 'expire-job-payloads',
			enabled: true,
			prefix: 'job/payloads/',
			expiration: { days: 1 },
		})

		// ------------------------------------------------------------
		// Create the ECS cluster

		const group = new Group(ctx.base, 'job', 'cluster')

		const cluster = new aws.ecs.Cluster(
			group,
			'cluster',
			{
				name: `${ctx.app.name}-job`,
			},
			{
				replaceOnChanges: ['name'],
				import: ctx.import
					? `arn:aws:ecs:${ctx.appConfig.region}:${ctx.accountId}:cluster/${ctx.app.name}-job`
					: undefined,
			}
		)

		ctx.shared.set('job', 'cluster-name', cluster.name)
		ctx.shared.set('job', 'cluster-arn', cluster.arn)

		// ------------------------------------------------------------
		// Create shared security group (egress-only)

		const securityGroup = new aws.security.Group(group, 'security-group', {
			name: `${ctx.app.name}-job`,
			description: 'Shared security group for jobs',
			vpcId: ctx.shared.get('vpc', 'id'),
			revokeRulesOnDelete: true,
			tags: {
				APP: ctx.appConfig.name,
			},
		})

		new aws.vpc.SecurityGroupEgressRule(group, 'egress-rule', {
			securityGroupId: securityGroup.id,
			description: 'Allow all outbound traffic from jobs',
			ipProtocol: '-1',
			cidrIpv4: '0.0.0.0/0',
			tags: {
				APP: ctx.appConfig.name,
			},
		})

		ctx.shared.set('job', 'security-group-id', securityGroup.id)
	},
	onStack(ctx) {
		const jobs = Object.entries(ctx.stackConfig.jobs ?? {})
		if (jobs.length === 0) return

		const subnets = ctx.shared.get('vpc', 'private-subnets')
		ctx.addEnv(
			'JOB_SUBNETS',
			new Output(new Set(findInputDeps(subnets)), async (resolve: (value: string) => void) => {
				const resolved = await resolveInputs(subnets)
				resolve(JSON.stringify(resolved))
			})
		)
		ctx.addEnv('JOB_SECURITY_GROUP', ctx.shared.get('job', 'security-group-id'))
		ctx.addEnv('JOB_PAYLOAD_BUCKET', ctx.shared.get('asset', 'bucket').name)

		const roleArns: Output<string>[] = []

		for (const [id, props] of jobs) {
			const group = new Group(ctx.stack, 'job', id)
			const job = createFargateJob(group, ctx, 'job', id, props)

			roleArns.push(job.taskRole.arn, job.executionRole.arn)
		}

		// ------------------------------------------------------------
		// Permissions for invoking jobs

		ctx.addPermission({
			actions: ['ecs:RunTask'],
			resources: [
				`arn:aws:ecs:${ctx.appConfig.region}:${ctx.accountId}:task-definition/${ctx.app.name}--${ctx.stackConfig.name}--*`,
			],
		})

		// Running a task hands ecs the task & execution role of the job.
		ctx.addPermission({
			actions: ['iam:PassRole'],
			resources: roleArns,
			conditions: {
				StringEquals: {
					'iam:PassedToService': 'ecs-tasks.amazonaws.com',
				},
			},
		})
	},
})

import { Group, Output, resolveInputs, findInputDeps } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { camelCase } from 'change-case'
import { relative } from 'path'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { createFargateJob } from './util.js'

const typeGenCode = `
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any

type Invoke<N extends string, F extends Func> = Parameters<F> extends []
	? InvokeWithoutPayload<N, F>
	: unknown extends Parameters<F>[0]
		? InvokeWithoutPayload<N, F>
		: InvokeWithPayload<N, F>

type InvokeWithPayload<Name extends string, F extends Func> = {
	readonly name: Name
	(payload: Parameters<F>[0]): Promise<{ taskArn: string | undefined }>
}

type InvokeWithoutPayload<Name extends string, F extends Func> = {
	readonly name: Name
	(payload?: Parameters<F>[0]): Promise<{ taskArn: string | undefined }>
}

type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => void | Promise<void>
type MockBuilder<F extends Func> = (handle?: MockHandle<F>) => void
type MockObject<F extends Func> = Mock<Parameters<F>, ReturnType<F>>
`

export const jobFeature = defineFeature({
	name: 'job',
	async onTypeGen(ctx) {
		const types = new TypeFile('@awsless/awsless')
		const resources = new TypeObject(1)
		const mocks = new TypeObject(1)
		const mockResponses = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const mock = new TypeObject(2)
			const mockResponse = new TypeObject(2)

			for (const [name, props] of Object.entries(stack.jobs || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const funcName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'job',
					resourceName: name,
				})

				if ('file' in props.code) {
					const relFile = relative(directories.types, props.code.file)

					types.addImport(varName, relFile)
					resource.addType(name, `Invoke<'${funcName}', typeof ${varName}>`)
					mock.addType(name, `MockBuilder<typeof ${varName}>`)
					mockResponse.addType(name, `MockObject<typeof ${varName}>`)
				}
			}

			mocks.addType(stack.name, mock)
			resources.addType(stack.name, resource)
			mockResponses.addType(stack.name, mockResponse)
		}

		types.addCode(typeGenCode)
		types.addInterface('JobResources', resources)
		types.addInterface('JobMock', mocks)
		types.addInterface('JobMockResponse', mockResponses)

		await ctx.write('job.d.ts', types, true)
	},
	onBefore(ctx) {
		const group = new Group(ctx.base, 'job', 'asset')

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			bucket: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'job',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			forceDestroy: true,
			lifecycleRule: [
				{
					id: 'expire-payloads',
					enabled: true,
					prefix: 'payloads/',
					expiration: { days: 1 },
				},
			],
		})

		ctx.shared.set('job', 'bucket-name', bucket.bucket)
	},
	onApp(ctx) {
		const found = ctx.stackConfigs.filter(stack => {
			return Object.keys(stack.jobs ?? {}).length > 0
		})

		if (found.length === 0) {
			return
		}

		// ------------------------------------------------------------
		// Create the ECS cluster

		const group = new Group(ctx.base, 'job', 'cluster')

		const cluster = new aws.ecs.Cluster(group, 'cluster', {
			name: `${ctx.app.name}-job`,
		})

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
		if (!ctx.shared.has('job', 'security-group-id')) return

		// Env vars for job invocation (added at stack level to avoid base stack dependency issues)
		const subnets = ctx.shared.get('vpc', 'public-subnets')
		ctx.addEnv(
			'JOB_SUBNETS',
			new Output(new Set(findInputDeps(subnets)), async (resolve: (value: string) => void) => {
				const resolved = await resolveInputs(subnets)
				resolve(JSON.stringify(resolved))
			})
		)
		ctx.addEnv('JOB_SECURITY_GROUP', ctx.shared.get('job', 'security-group-id'))
		ctx.addEnv('JOB_PAYLOAD_BUCKET', ctx.shared.get('job', 'bucket-name'))

		for (const [id, props] of Object.entries(ctx.stackConfig.jobs ?? {})) {
			const group = new Group(ctx.stack, 'job', id)
			createFargateJob(group, ctx, 'job', id, props)
		}

		// ------------------------------------------------------------
		// Permissions for invoking jobs

		ctx.addStackPermission({
			actions: ['ecs:RunTask'],
			resources: [
				`arn:aws:ecs:${ctx.appConfig.region}:*:task-definition/${ctx.app.name}--${ctx.stackConfig.name}--*`,
			],
		})

		ctx.addStackPermission({
			actions: ['iam:PassRole'],
			resources: ['*'],
			conditions: {
				StringEquals: {
					'iam:PassedToService': 'ecs-tasks.amazonaws.com',
				},
			},
		})

		ctx.addStackPermission({
			actions: ['s3:PutObject'],
			resources: [
				`arn:aws:s3:::${formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'job',
					resourceName: 'assets',
					postfix: ctx.appId,
				})}/payloads/*`,
			],
		})
	},
})

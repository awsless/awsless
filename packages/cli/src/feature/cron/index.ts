import { relative } from 'node:path'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { formatRoutePayload } from 'awsless'
import { camelCase } from 'change-case'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { shortId } from '../../util/id.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'

const typeGenCode = `
import { InvokeOptions } from '@awsless/lambda'
import type { Mock } from 'vitest'

type Func = (...args: any[]) => any

type Options = Omit<InvokeOptions, 'name' | 'payload' | 'type' | 'reflectViewableErrors'>

type Invoke<N extends string, F extends Func> = unknown extends Parameters<F>[0] ? InvokeWithoutPayload<N, F> : InvokeWithPayload<N, F>

type InvokeWithPayload<Name extends string, F extends Func> = {
	readonly name: Name
	(payload: Parameters<F>[0], options?: Options): Promise<void>
}

type InvokeWithoutPayload<Name extends string, F extends Func> = {
	readonly name: Name
	(payload?: Parameters<F>[0], options?: Options): Promise<void>
}
`

export const cronFeature = defineFeature({
	name: 'cron',
	onDev(ctx) {
		// Crons never fire on a timer locally, they only run through a
		// manual trigger on the dev dashboard.
		for (const stack of ctx.stackConfigs) {
			for (const [id, props] of Object.entries(stack.crons ?? {})) {
				ctx.registerResource({
					kind: 'cron',
					stack: stack.name,
					id,
					routeKey: formatRouteKey(stack.name, 'cron', id),
					envelope: props.payload,
					detail: props.schedule,
				})
			}
		}
	},
	async onTypeGen(ctx) {
		const types = new TypeFile('awsless')
		const resources = new TypeObject(1)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)

			for (const [name, props] of Object.entries(stack.crons || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const funcName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'cron',
					resourceName: name,
				})

				const relFile = relative(directories.types, props.consumer.code.file)

				types.addImport(varName, relFile)
				resource.addType(name, `Invoke<'${funcName}', typeof ${varName}>`)
			}

			resources.addType(stack.name, resource)
		}

		types.addCode(typeGenCode)
		types.addInterface('CronResources', resources)

		await ctx.write('cron.d.ts', types, true)
	},
	onApp(ctx) {
		const found = ctx.stackConfigs.find(stackConfig => Object.keys(stackConfig.crons ?? {}).length > 0)
		if (found) {
			const bundle = ctx.shared.get('bundle', 'main')
			const groupName = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'cron',
				resourceName: 'group',
			})

			const group = new aws.scheduler.ScheduleGroup(
				ctx.base,
				'cron',
				{
					name: groupName,
					tags: {
						app: ctx.app.name,
					},
				},
				{
					import: ctx.import ? groupName : undefined,
				}
			)

			const roleName = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'cron',
				resourceName: 'schedule',
			})

			// All cron schedules share one role to invoke the bundle.
			const role = new aws.iam.Role(
				ctx.base,
				'cron-role',
				{
					name: roleName,
					description: `${ctx.app.name} cron scheduler`,
					assumeRolePolicy: JSON.stringify({
						Version: '2012-10-17',
						Statement: [
							{
								Action: 'sts:AssumeRole',
								Effect: 'Allow',
								Principal: {
									Service: 'scheduler.amazonaws.com',
								},
							},
						],
					}),
					inlinePolicy: [
						{
							name: 'InvokeFunction',
							policy: bundle.alias.arn.pipe(arn =>
								JSON.stringify({
									Version: '2012-10-17',
									Statement: [
										{
											Action: ['lambda:InvokeFunction'],
											Effect: 'Allow',
											Resource: arn,
										},
										// The on-failure queue only exists when the app configures it.
										...(ctx.appConfig.onFailure
											? [
													{
														Action: ['sqs:SendMessage'],
														Effect: 'Allow',
														Resource: `arn:aws:sqs:*:*:${formatGlobalResourceName({
															appName: ctx.app.name,
															resourceType: 'on-failure',
															resourceName: 'failure',
														})}`,
													},
												]
											: []),
									],
								})
							),
						},
					],
				},
				{
					import: ctx.import ? roleName : undefined,
				}
			)

			ctx.shared.set('cron', 'group-name', group.name)
			ctx.shared.set('cron', 'role-arn', role.arn)
		}
	},
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		for (const [id, props] of Object.entries(ctx.stackConfig.crons ?? {})) {
			const group = new Group(ctx.stack, 'cron', id)
			const routeKey = formatRouteKey(ctx.stack.name, 'cron', id)

			registerBundleFunction(ctx, routeKey, props.consumer)

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'cron',
				resourceName: shortId(id),
			})

			const scheduleGroupName = formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'cron',
				resourceName: 'group',
			})

			new aws.scheduler.Schedule(
				group,
				'cron',
				{
					name,
					state: props.enabled ? 'ENABLED' : 'DISABLED',
					groupName: ctx.shared.get('cron', 'group-name'),
					description: `${ctx.stack.name} ${id}`,
					scheduleExpression: props.schedule,
					flexibleTimeWindow: { mode: 'OFF' },
					target: {
						arn: bundle.alias.arn,
						roleArn: ctx.shared.get('cron', 'role-arn'),
						input: JSON.stringify(formatRoutePayload(routeKey, props.payload)),
						// Fires the scheduler can't deliver land on the on-failure queue.
						deadLetterConfig: ctx.appConfig.onFailure
							? {
									arn: `arn:aws:sqs:${ctx.appConfig.region}:${ctx.accountId}:${formatGlobalResourceName(
										{
											appName: ctx.app.name,
											resourceType: 'on-failure',
											resourceName: 'failure',
										}
									)}`,
								}
							: undefined,
					},
				},
				{
					import: ctx.import ? `${scheduleGroupName}/${name}` : undefined,
				}
			)
		}
	},
})

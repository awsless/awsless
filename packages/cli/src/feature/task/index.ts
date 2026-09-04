import { relative } from 'path'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { camelCase } from 'change-case'
import { createSchedulerServer } from '../../dev/servers/scheduler.js'
import { defineFeature } from '../../feature.js'
import { funcType, invokeTypes, testMockTypes, writeResourceTypes } from '../../type-gen/snippets.js'
import { formatGlobalResourceName, formatLocalResourceName, getBundleFunctionName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'

const typeGenCode = `
import { Duration } from '@awsless/duration'
import { InvokeOptions } from '@awsless/lambda'
import type { Mock } from 'vitest'

${funcType}

type Options = Omit<InvokeOptions, 'name' | 'payload' | 'type' | 'qualifier' | 'reflectViewableErrors'> & {
	schedule?: Duration | Date
}
${invokeTypes({ returns: 'Promise<void>', options: 'Options' })}${testMockTypes({
	// A schedule records on its own spy before the task runs.
	members: 'readonly scheduled: MockBuilder<F> & MockObject<F>',
})}`

export const taskFeature = defineFeature({
	name: 'task',
	async onDev(ctx) {
		const tasks = ctx.stackConfigs.flatMap(stack => {
			return Object.keys(stack.tasks ?? {}).map(id => ({ stackName: stack.name, id }))
		})

		if (tasks.length === 0) {
			return
		}

		for (const { stackName, id } of tasks) {
			ctx.registerResource({
				kind: 'task',
				stack: stackName,
				id,
				routeKey: formatRouteKey(stackName, 'task', id),
			})
		}

		// Immediate task invokes already flow through the local lambda
		// emulator. Delayed tasks create one-off schedules, which the
		// local scheduler emulator turns into timers.
		// The shim survives restarts, so long lived children (like the
		// vite dev server) keep a valid endpoint.
		const { server, port } = await ctx.keep('shim:scheduler', null, async () => {
			const server = createSchedulerServer()
			const port = await server.listen()

			return { value: { server, port }, stop: () => server.stop() }
		})

		ctx.addEnv('AWS_ENDPOINT_URL_SCHEDULER', `http://127.0.0.1:${port}`)

		ctx.registerServer({
			name: 'scheduler',
			start({ dispatch, reportFailure }) {
				server.connect(dispatch, reportFailure)
			},
		})
	},
	async onTypeGen(ctx) {
		await writeResourceTypes(ctx, {
			kind: 'task',
			interfaceName: 'TaskResources',
			code: typeGenCode,
			stacks(stack, add, types) {
				for (const [name, props] of Object.entries(stack.tasks || {})) {
					const varName = camelCase(`${stack.name}-${name}`)
					const funcName = formatLocalResourceName({
						appName: ctx.appConfig.name,
						stackName: stack.name,
						resourceType: 'task',
						resourceName: name,
					})

					types.addImport(varName, relative(directories.types, props.consumer.code.file))
					add(name, `Invoke<'${funcName}', typeof ${varName}>`, `TestMockEntry<typeof ${varName}>`)
				}
			},
		})
	},
	onApp(ctx) {
		const group = new Group(ctx.base, 'task', 'main')

		const scheduleGroupName = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'task',
			resourceName: 'group',
		})
		const failureQueueName = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'on-failure',
			resourceName: 'failure',
		})
		const { region } = ctx.appConfig
		const account = ctx.accountId

		new aws.scheduler.ScheduleGroup(
			group,
			'group',
			{
				name: scheduleGroupName,
				tags: {
					app: ctx.app.name,
				},
			},
			{
				import: ctx.import ? scheduleGroupName : undefined,
			}
		)

		const roleName = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'task',
			resourceName: 'schedule',
		})

		const role = new aws.iam.Role(
			group,
			'schedule',
			{
				name: roleName,
				description: `Task schedule ${ctx.app.name}`,
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
						name: 'ScheduleTarget',
						policy: JSON.stringify({
							Version: '2012-10-17',
							Statement: [
								{
									Action: ['lambda:InvokeFunction'],
									Effect: 'Allow',
									Resource: `arn:aws:lambda:${region}:${account}:function:${getBundleFunctionName(ctx.appConfig.name)}:*`,
								},
								// The on-failure queue only exists when the app configures it.
								...(ctx.appConfig.onFailure
									? [
											{
												Action: ['sqs:SendMessage'],
												Effect: 'Allow',
												Resource: `arn:aws:sqs:${region}:${account}:${failureQueueName}`,
											},
										]
									: []),
							],
						}),
					},
				],
			},
			{
				import: ctx.import ? roleName : undefined,
			}
		)

		ctx.addPermission({
			actions: ['scheduler:CreateSchedule'],
			resources: [`arn:aws:scheduler:${region}:${account}:schedule/${scheduleGroupName}/*`],
		})

		// Creating a schedule hands the scheduler its role.
		ctx.addPermission({
			actions: ['iam:PassRole'],
			resources: [role.arn],
			conditions: {
				StringEquals: {
					'iam:PassedToService': 'scheduler.amazonaws.com',
				},
			},
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.tasks ?? {})) {
			registerBundleFunction(ctx, formatRouteKey(ctx.stack.name, 'task', id), props.consumer)
		}
	},
})

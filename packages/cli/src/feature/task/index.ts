import { relative } from 'path'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { camelCase } from 'change-case'
import { createSchedulerServer } from '../../dev/servers/scheduler.js'
import { defineFeature } from '../../feature.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { formatGlobalResourceName, formatLocalResourceName, getBundleFunctionName } from '../../util/name.js'
import { directories } from '../../util/path.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'
import { funcType, invokeTypes, testMockTypes } from '../../type-gen/snippets.js'

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
		const types = new TypeFile('awsless')
		const resources = new TypeObject(1)
		const testMocks = new TypeObject(2)

		for (const stack of ctx.stackConfigs) {
			const resource = new TypeObject(2)
			const testMock = new TypeObject(3)

			for (const [name, props] of Object.entries(stack.tasks || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const funcName = formatLocalResourceName({
					appName: ctx.appConfig.name,
					stackName: stack.name,
					resourceType: 'task',
					resourceName: name,
				})

				const relFile = relative(directories.types, props.consumer.code.file)

				types.addImport(varName, relFile)
				resource.addType(name, `Invoke<'${funcName}', typeof ${varName}>`)
				testMock.addType(name, `TestMockEntry<typeof ${varName}>`)
			}

			resources.addType(stack.name, resource)
			testMocks.addType(stack.name, testMock)
		}

		const testMock = new TypeObject(1)
		testMock.addType('task', testMocks)

		types.addCode(typeGenCode)
		types.addInterface('TaskResources', resources)
		types.addInterface('TestMock', testMock)

		await ctx.write('task.d.ts', types, true)
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
									Resource: `arn:aws:lambda:*:*:function:${getBundleFunctionName(ctx.appConfig.name)}:*`,
								},
								{
									Action: ['sqs:SendMessage'],
									Effect: 'Allow',
									Resource: `arn:aws:sqs:*:*:${failureQueueName}`,
								},
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
			resources: [`arn:aws:scheduler:*:*:schedule/${scheduleGroupName}/*`],
		})

		ctx.addPermission({
			actions: ['iam:PassRole'],
			resources: [role.arn],
		})
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.tasks ?? {})) {
			registerBundleFunction(ctx, formatRouteKey(ctx.stack.name, 'task', id), props.consumer)
		}
	},
})

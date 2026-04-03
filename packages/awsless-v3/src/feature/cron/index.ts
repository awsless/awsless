import { Group } from '@terraforge/core'
import { aws } from '@terraforge/aws'
import { defineFeature } from '../../feature.js'
import { createAsyncLambdaFunction } from '../function/util.js'
import { formatGlobalResourceName, formatLocalResourceName } from '../../util/name.js'
import { shortId } from '../../util/id.js'
import { TypeFile } from '../../type-gen/file.js'
import { TypeObject } from '../../type-gen/object.js'
import { camelCase } from 'change-case'
import { relative } from 'node:path'
import { directories } from '../../util/path.js'

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
	async onTypeGen(ctx) {
		const types = new TypeFile('@awsless/awsless')
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

				if ('file' in props.consumer.code) {
					const relFile = relative(directories.types, props.consumer.code.file)

					types.addImport(varName, relFile)
					resource.addType(name, `Invoke<'${funcName}', typeof ${varName}>`)
				}
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
			const group = new aws.scheduler.ScheduleGroup(ctx.base, 'cron', {
				name: formatGlobalResourceName({
					appName: ctx.app.name,
					resourceType: 'cron',
					resourceName: 'group',
				}),
				tags: {
					app: ctx.app.name,
				},
			})

			ctx.shared.set('cron', 'group-name', group.name)
		}
	},
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.crons ?? {})) {
			const group = new Group(ctx.stack, 'cron', id)

			const { lambda } = createAsyncLambdaFunction(group, ctx, 'cron', id, {
				consumer: props.consumer,
				retryAttempts: props.retryAttempts,
			})

			const name = formatLocalResourceName({
				appName: ctx.app.name,
				stackName: ctx.stack.name,
				resourceType: 'cron',
				resourceName: shortId(id),
			})

			const scheduleRole = new aws.iam.Role(group, 'warm', {
				name,
				description: `Cron ${ctx.stack.name} ${id}`,
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
						policy: lambda.arn.pipe(arn =>
							JSON.stringify({
								Version: '2012-10-17',
								Statement: [
									{
										Action: ['lambda:InvokeFunction'],
										Effect: 'Allow',
										Resource: arn,
									},
								],
							})
						),
					},
				],
			})

			new aws.scheduler.Schedule(group, 'warm', {
				name,
				state: props.enabled ? 'ENABLED' : 'DISABLED',
				groupName: ctx.shared.get('cron', 'group-name'),
				description: `${ctx.stack.name} ${id}`,
				scheduleExpression: props.schedule,
				flexibleTimeWindow: { mode: 'OFF' },
				target: {
					arn: lambda.arn,
					roleArn: scheduleRole.arn,
					input: JSON.stringify(props.payload) ?? '{}',
				},
			})
		}
	},
})

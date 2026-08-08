import { days } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { createLambdaFunctionFromZip, registerFunctionBuild } from '../function/util.js'

export const onErrorLogFeature = defineFeature({
	name: 'on-error-log',
	onApp(ctx) {
		const props = ctx.appConfig.defaults.onErrorLog

		if (!props) {
			return
		}

		const group = new Group(ctx.base, 'on-error-log', 'main')
		const consumer = props.consumer

		// ------------------------------------------------
		// Build the log handler & consumer into a single
		// stand-alone lambda, so a failing bundle can never
		// recursively consume its own error logs.

		const name = formatGlobalResourceName({
			appName: ctx.app.name,
			resourceType: 'on-error-log',
			resourceName: 'handler',
		})

		const build = registerFunctionBuild(ctx, name, {
			code: consumer.code,
			handler: consumer.handler,
			wrapper: join(dirname(fileURLToPath(import.meta.url)), '/handlers/on-error-log.js'),
		})

		// The handler is created before the shared subscriber arn is set,
		// so its own log group is never subscribed to itself.
		const handler = createLambdaFunctionFromZip(group, ctx, 'on-error-log', 'handler', {
			zipFile: build.zipFile,
			sourceHash: build.sourceHash,
			runtime: 'nodejs24.x',
			handler: 'index.default',
			memorySize: consumer.memorySize ?? ctx.appConfig.defaults.function.memorySize,
			timeout: consumer.timeout ?? ctx.appConfig.defaults.function.timeout,
			architecture: consumer.architecture ?? ctx.appConfig.defaults.function.architecture,
			vpc: consumer.vpc,
			log: {
				format: consumer.log?.format ?? 'json',
				level: consumer.log?.level ?? 'warn',
				system: consumer.log?.system ?? 'warn',
				retention: consumer.log?.retention ?? days(3),
			},
		})

		// The consumer runs with the same env & permissions it had inside the bundle.
		ctx.onEnv(build.addEnv)
		ctx.onBind(build.addEnv)
		ctx.onPermission(statement => handler.addPermission(statement))

		// Deny calling other functions to stop circular loop problems,
		// while sns:Publish stays open so the consumer can alert.
		handler.addPermission({
			effect: 'deny',
			actions: ['lambda:InvokeFunction', 'lambda:InvokeAsync', 'sqs:SendMessage'],
			resources: ['*'],
		})

		// ------------------------------------------------
		// Every feature that owns a log group subscribes itself
		// to the handler through the shared subscriber arn.

		const permission = new aws.lambda.Permission(
			group,
			'permission',
			{
				action: 'lambda:InvokeFunction',
				principal: 'logs.amazonaws.com',
				functionName: handler.lambda.functionName,
				sourceArn: `arn:aws:logs:${ctx.appConfig.region}:${ctx.accountId}:log-group:/aws/*/${ctx.app.name}--*`,
			},
			{
				replaceOnChanges: ['functionName'],
			}
		)

		ctx.shared.set('on-error-log', 'subscriber-arn', handler.lambda.arn)
		ctx.shared.set('on-error-log', 'permission', permission)
	},
})

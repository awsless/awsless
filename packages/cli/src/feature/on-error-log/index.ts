import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { days } from '@awsless/duration'
import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { formatRouteKey, registerBundleFunction } from '../bundle/util.js'
import {
	addEnvWithoutConfigs,
	createLambda,
	deployFunctionSourcemaps,
	registerFunctionBuild,
} from '../function/util.js'
import { SOURCEMAP_ROOT } from './keys.js'

export const onErrorLogFeature = defineFeature({
	name: 'on-error-log',
	onApp(ctx) {
		const props = ctx.appConfig.onErrorLog

		if (!props) {
			return
		}

		const group = new Group(ctx.base, 'on-error-log', 'main')
		const consumer = props.consumer

		// The local dev environment has no stand-alone lambdas - the
		// consumer builds into the local bundle worker instead. The
		// bundle feature runs after this one, so the registration waits
		// until every feature has set up.
		if (ctx.dev) {
			ctx.onReady(() => {
				registerBundleFunction(ctx, formatRouteKey('base', 'on-error-log', 'consumer'), consumer)
			})
			return
		}

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

		// Failed invokes go straight to the on-failure deadletter instead
		// of its bucket: the on-failure consumer's error logs feed this
		// handler, so a bucket destination would close a loop.
		const deadletter = ctx.shared.has('on-failure', 'resources')
			? ctx.shared.get('on-failure', 'resources').deadletter
			: undefined

		// The handler is created before the shared subscriber arn is set,
		// so its own log group is never subscribed to itself.
		const handler = createLambda(group, ctx, 'on-error-log', 'handler', {
			code: build,
			runtime: 'nodejs24.x',
			handler: 'index.default',
			memorySize: consumer.memorySize ?? ctx.appConfig.function.memorySize,
			timeout: consumer.timeout ?? ctx.appConfig.function.timeout,
			architecture: consumer.architecture ?? ctx.appConfig.function.architecture,
			vpc: consumer.vpc,
			onFailure: deadletter ? { arn: deadletter.arn, kind: 'queue' } : false,
			log: {
				format: consumer.log?.format ?? 'json',
				level: consumer.log?.level ?? 'warn',
				system: consumer.log?.system ?? 'warn',
				retention: consumer.log?.retention ?? days(3),
			},
		})

		deployFunctionSourcemaps(group, ctx, {
			name,
			version: handler.lambda.version,
		})

		// The same env & permissions the consumer had inside the bundle,
		// minus the config preload. The queue sends are stripped instead
		// of denied, since a deny would also block the deadletter destination.
		const addEnv = addEnvWithoutConfigs(build)

		ctx.onEnv(addEnv)
		ctx.onBind(addEnv)
		ctx.onPermission(statement => {
			const actions = statement.actions.filter(action => action !== 'sqs:SendMessage')

			if (actions.length > 0) {
				handler.addPermission({ ...statement, actions })
			}
		})
		ctx.shared.add('function', 'role', name, handler.role)

		// The handler maps minified stack traces back to the original
		// source: the version index object in the asset bucket names the
		// erroring version's sourcemap prefix & the maps live next to it.
		const bucket = ctx.shared.get('asset', 'bucket')

		build.addEnv('SOURCEMAP_BUCKET', bucket.name)

		handler.addPermission(
			{
				actions: ['s3:GetObject'],
				resources: [$interpolate`${bucket.arn}/${SOURCEMAP_ROOT}*`],
			},
			// Without ListBucket a missing key answers 403 instead of
			// 404, so the handler could never cache "no maps uploaded".
			{
				actions: ['s3:ListBucket'],
				resources: [bucket.arn],
				conditions: {
					StringLike: {
						's3:prefix': `${SOURCEMAP_ROOT}*`,
					},
				},
			}
		)

		// Deny calling other functions to stop circular loop problems,
		// while sns:Publish stays open so the consumer can alert.
		handler.addPermission({
			effect: 'deny',
			actions: ['lambda:InvokeFunction'],
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

import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { formatRouteEnvName } from 'awsless'
import { defineFeature } from '../../feature.js'
import { formatRouteKey, internalHandler, parseExportName } from '../bundle/util.js'
import { filterPattern } from './util.js'

export const onErrorLogFeature = defineFeature({
	name: 'on-error-log',
	onApp(ctx) {
		const props = ctx.appConfig.defaults.onErrorLog

		if (!props) {
			return
		}

		const group = new Group(ctx.base, 'on-error-log', 'main')
		const bundle = ctx.shared.get('bundle', 'main')
		const consumer = props.consumer

		// ------------------------------------------------
		// Add the error log handler & consumer to the bundle

		const handlerRoute = formatRouteKey(ctx.app.name, 'on-error-log', 'handler')
		const consumerRoute = formatRouteKey(ctx.app.name, 'on-error-log', 'consumer')

		bundle.addHandler({
			routeKey: handlerRoute,
			file: internalHandler('on-error-log'),
			exportName: 'default',
		})

		bundle.addEnv(formatRouteEnvName(handlerRoute, 'CONSUMER'), consumerRoute)

		bundle.addHandler({
			routeKey: consumerRoute,
			file: consumer.code.file,
			exportName: parseExportName(consumer.handler ?? ctx.appConfig.defaults.function.handler!),
			external: consumer.code.external,
			importAsString: consumer.code.importAsString,
		})

		for (const [name, value] of Object.entries(consumer.environment ?? {})) {
			bundle.addEnv(name, value)
		}

		for (const permission of consumer.permissions ?? []) {
			bundle.addPermission(permission)
		}

		// ------------------------------------------------
		// Subscribe the bundle to every error log,
		// including the bundles own log group.

		const permission = new aws.lambda.Permission(
			group,
			'permission',
			{
				action: 'lambda:InvokeFunction',
				principal: 'logs.amazonaws.com',
				functionName: bundle.lambda.functionName,
				qualifier: bundle.alias.name,
				sourceArn: `arn:aws:logs:${ctx.appConfig.region}:${ctx.accountId}:log-group:/aws/*/${ctx.app.name}--*`,
			},
			{
				replaceOnChanges: ['functionName', 'qualifier'],
			}
		)

		if (bundle.logGroup) {
			new aws.cloudwatch.LogSubscriptionFilter(
				group,
				'bundle',
				{
					name: 'error-log-subscription',
					destinationArn: bundle.alias.arn,
					logGroupName: bundle.logGroup.name,
					filterPattern,
				},
				{
					dependsOn: [permission],
				}
			)
		}

		ctx.shared.set('on-error-log', 'subscriber-arn', bundle.alias.arn)
		ctx.shared.set('on-error-log', 'permission', permission)
	},
})

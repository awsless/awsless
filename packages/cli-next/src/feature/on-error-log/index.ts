import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { formatRouteEnvName } from 'awsless'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { registerBundleFunction, formatRouteKey } from '../bundle/util.js'
import { filterPattern } from './util.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

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
			file: join(dirname(fileURLToPath(import.meta.url)), '/handlers/on-error-log.mjs'),
			exportName: 'default',
		})

		bundle.addEnv(formatRouteEnvName(handlerRoute, 'CONSUMER'), consumerRoute)

		// The handler registers its own request ids in this table, so a
		// crashed run (a consumer OOM) can recognize & skip the errors
		// it produced itself, instead of consuming them in a loop.
		const requestTable = new aws.dynamodb.Table(group, 'requests', {
			name: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'on-error-log',
				resourceName: 'requests',
			}),
			hashKey: 'id',
			billingMode: 'PAY_PER_REQUEST',
			ttl: {
				enabled: true,
				attributeName: 'ttl',
			},
			attribute: [
				{
					name: 'id',
					type: 'S',
				},
			],
		})

		bundle.addEnv(formatRouteEnvName(handlerRoute, 'TABLE'), requestTable.name)

		bundle.addPermission({
			effect: 'allow',
			actions: ['dynamodb:PutItem', 'dynamodb:GetItem'],
			resources: [requestTable.arn],
		})

		registerBundleFunction(ctx, consumerRoute, consumer)

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

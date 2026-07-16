import { aws } from '@terraforge/aws'
import { Group } from '@terraforge/core'
import { defineFeature } from '../../feature.js'
import { formatGlobalResourceName } from '../../util/name.js'
import { createBundleLambda } from './util.js'

export const bundleFeature = defineFeature({
	name: 'bundle',
	// We are putting the bucket in a onBefore hook because
	// we will need it for the standalone lambda functions
	// defined in the onApp hook of different features.
	onBefore(ctx) {
		const group = new Group(ctx.base, 'function', 'asset')

		// ------------------------------------------------------
		// Define the Bucket used to store the lambda function code.

		const bucket = new aws.s3.Bucket(group, 'bucket', {
			bucket: formatGlobalResourceName({
				appName: ctx.app.name,
				resourceType: 'function',
				resourceName: 'assets',
				postfix: ctx.appId,
			}),
			forceDestroy: true,
			// versioning: true,
			// forceDelete: true,
		})

		ctx.shared.set('bundle', 'bucket-name', bucket.bucket)
	},
	onApp(ctx) {
		// ------------------------------------------------------
		// Create the app bundle lambda that contains all handlers.

		const defaults = ctx.appConfig.defaults.function
		const bundle = createBundleLambda(ctx, defaults)

		bundle.addEnv('APP', ctx.appConfig.name)
		bundle.addEnv('APP_ID', ctx.appId)
		bundle.addEnv('AWS_ACCOUNT_ID', ctx.accountId)

		// The bundle always lives inside a vpc, so use the dualstack aws endpoints.
		bundle.addEnv('AWS_USE_DUALSTACK_ENDPOINT', 'true')

		// The app level function defaults apply to every handler.
		for (const [name, value] of Object.entries(defaults.environment ?? {})) {
			bundle.addEnv(name, value)
		}

		ctx.onEnv(bundle.addEnv)
		ctx.onBind(bundle.addEnv)

		// Every feature defines the permissions for its own resources.
		ctx.onPermission(bundle.addPermission)

		for (const permission of defaults.permissions ?? []) {
			bundle.addPermission(permission)
		}

		ctx.shared.set('bundle', 'main', {
			lambda: bundle.lambda,
			alias: bundle.alias,
			logGroup: bundle.logGroup,
			policy: bundle.policy,
			addHandler: bundle.addHandler,
			addEnv: bundle.addEnv,
			addLayer: bundle.addLayer,
			addPermission: bundle.addPermission,
		})
	},
	onStack(ctx) {
		const bundle = ctx.shared.get('bundle', 'main')

		// Collect the stack scoped env vars & permissions.
		ctx.onEnv(bundle.addEnv)
		ctx.onPermission(bundle.addPermission)
	},
})

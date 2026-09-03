import { createSesServer } from '../../dev/servers/ses.js'
import { defineFeature } from '../../feature.js'

export const emailFeature = defineFeature({
	name: 'email',
	onApp(ctx) {
		// Email.send works out of the box through any verified ses
		// identity of the account. Sending through the app configuration
		// set is authorized against its own ARN, not just the identity.
		ctx.addPermission({
			actions: ['ses:SendEmail', 'ses:SendRawEmail'],
			resources: [
				`arn:aws:ses:${ctx.appConfig.region}:${ctx.accountId}:identity/*`,
				`arn:aws:ses:${ctx.appConfig.region}:${ctx.accountId}:configuration-set/${ctx.app.name}`,
			],
		})
	},
	async onDev(ctx) {
		// Every sent email is captured for the dashboard instead of
		// being delivered.
		const { port } = await ctx.keep('shim:ses-email', null, async () => {
			const server = createSesServer()
			const port = await server.listen()

			return { value: { server, port }, stop: () => server.stop() }
		})

		ctx.addEnv('AWS_ENDPOINT_URL_SESV2', `http://127.0.0.1:${port}`)
		ctx.addEnv('AWS_ENDPOINT_URL_SES', `http://127.0.0.1:${port}`)
		ctx.registerResource({ kind: 'email', id: 'outbox' })
	},
})

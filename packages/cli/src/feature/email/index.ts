import { defineFeature } from '../../feature.js'
import { createSesServer } from '../../dev/servers/ses.js'

export const emailFeature = defineFeature({
	name: 'email',
	onApp(ctx) {
		// Email.send works out of the box: the app wide role may send
		// through any verified ses identity of the account.
		ctx.addAppPermission({
			actions: ['ses:SendEmail', 'ses:SendRawEmail'],
			resources: ['*'],
		})
	},
	async onDev(ctx) {
		// Every sent email is captured for the dashboard instead of
		// being delivered.
		const { server, port } = await ctx.keep('shim:ses-email', null, async () => {
			const server = createSesServer()
			const port = await server.listen()

			return { value: { server, port }, stop: () => server.stop() }
		})

		void server

		ctx.addEnv('AWS_ENDPOINT_URL_SESV2', `http://127.0.0.1:${port}`)
		ctx.addEnv('AWS_ENDPOINT_URL_SES', `http://127.0.0.1:${port}`)
		ctx.registerResource({ kind: 'email', id: 'outbox' })
	},
})

import { afterEach, describe, expect, it } from 'vitest'
import { createSesServer } from '../src/dev/servers/ses'

const send = (port: number, body: unknown) =>
	fetch(`http://127.0.0.1:${port}/v2/email/outbound-emails`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	})

describe('dev ses', () => {
	const ses = createSesServer()

	afterEach(() => ses.stop())

	it('captures the text part & headers', async () => {
		const port = await ses.listen()

		await send(port, {
			FromEmailAddress: 'noreply@example.com',
			Destination: { ToAddresses: ['user@example.com'] },
			Content: {
				Simple: {
					Subject: { Data: 'Hello' },
					Body: { Html: { Data: '<p>Hello</p>' }, Text: { Data: 'Hello' } },
					Headers: [{ Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' }],
				},
			},
		})

		expect(ses.list()[0]).toMatchObject({
			from: 'noreply@example.com',
			to: ['user@example.com'],
			subject: 'Hello',
			html: '<p>Hello</p>',
			text: 'Hello',
			headers: [{ name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' }],
		})
	})

	it('captures a html only send without headers', async () => {
		const port = await ses.listen()

		await send(port, {
			FromEmailAddress: 'noreply@example.com',
			Destination: { ToAddresses: ['user@example.com'] },
			Content: { Simple: { Subject: { Data: 'Hi' }, Body: { Html: { Data: '<p>Hi</p>' } } } },
		})

		expect(ses.list()[0]).toMatchObject({ html: '<p>Hi</p>', text: undefined, headers: [] })
	})
})

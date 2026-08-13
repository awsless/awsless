import { sendEmail } from '@awsless/ses'

export type SendEmailProps = {
	/** The verified sender address. */
	from: string

	/** The recipient addresses. */
	to: string[]

	/** The subject line. */
	subject: string

	/** The html body. */
	html: string
}

// Sending goes through ses in production. The local dev environment
// captures every email in the dashboard instead of delivering it, and
// tests record sends on the `mock.email.send` spy.
export const Email = {
	async send(props: SendEmailProps) {
		await sendEmail(props)
	},
}

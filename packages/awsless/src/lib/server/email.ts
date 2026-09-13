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

// Local dev captures sends in the dashboard & tests record them on mock.email.send.
export const Email = {
	async send(props: SendEmailProps) {
		await sendEmail(props)
	},
}

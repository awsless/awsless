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

	/** The plain text alternative, next to the html. */
	text?: string

	/**
	 * Extra headers on the message, like `List-Unsubscribe` (at most 15;
	 * printable ASCII). SES refuses the ones it sets itself (From, To,
	 * Subject, Date, Message-ID, Content-Type, MIME-Version and the like).
	 */
	headers?: { name: string; value: string }[]
}

// Local dev captures sends in the dashboard & tests record them on mock.email.send.
export const Email = {
	async send(props: SendEmailProps) {
		await sendEmail(props)
	},
}

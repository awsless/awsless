import { SESv2Client } from '@aws-sdk/client-sesv2'

export type EmailHeader = {
	/** Printable ASCII without a colon, at most 126 characters. */
	name: string

	/** Printable ASCII, at most 995 characters (name and value together at most 996). */
	value: string
}

export type EmailAttachment = {
	filename: string

	/** The MIME type, like `application/pdf`. */
	contentType: string

	content: Uint8Array
}

export interface SendEmail {
	client?: SESv2Client

	subject: string
	from: string
	to: string[]
	html: string

	/** The plain text alternative, next to the html. */
	text?: string

	/**
	 * Extra headers on the message, like `List-Unsubscribe` (at most 15).
	 * SES refuses the ones it sets itself (From, To, Subject, Date,
	 * Message-ID, Content-Type, MIME-Version and the like).
	 */
	headers?: EmailHeader[]

	/** Files on the message, which SES caps at 40 MB in all after encoding. */
	attachments?: EmailAttachment[]
}

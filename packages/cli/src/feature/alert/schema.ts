import { kebabCase } from 'change-case'
import { z } from 'zod'
import { EmailSchema } from '../../config/schema/email.js'

export const AlertNameSchema = z
	.string()
	.min(3)
	.max(256)
	.regex(/^[a-z0-9\-]+$/i, 'Invalid alert name')
	.transform(value => kebabCase(value))
	.describe('Define alert name.')

export const AlertsDefaultSchema = z
	.record(
		AlertNameSchema,
		z.union([
			//
			EmailSchema.transform(v => [v]),
			EmailSchema.array(),
		])
	)
	.optional()
	.describe('Define the alerts in your app. Alerts are a way to send messages to one or more email addresses.')

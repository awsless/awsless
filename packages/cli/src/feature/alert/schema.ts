import { kebabCase } from 'change-case'
import { z } from 'zod'
import { ConfigRefSchema } from '../../config/schema/config-ref.js'
import { EmailSchema } from '../../config/schema/email.js'
import { PhoneSchema } from '../../config/schema/phone.js'

const AlertNameSchema = z
	.string()
	.min(3)
	.max(256)
	.regex(/^[a-z0-9\-]+$/i, 'Invalid alert name')
	.transform(value => kebabCase(value))
	.describe('Define alert name.')

const EndpointSchema = z.union([EmailSchema, PhoneSchema, ConfigRefSchema])

export const AlertsDefaultSchema = z
	.record(
		AlertNameSchema,
		z.union([
			//
			EndpointSchema.transform(v => [v]),
			EndpointSchema.array(),
		])
	)
	.optional()
	.describe(
		'Define the alerts in your app. Alerts are a way to send messages to one or more email addresses or phone numbers. Private endpoints can reference a remote config value with "config:<name>".'
	)

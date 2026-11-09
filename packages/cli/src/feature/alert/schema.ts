import { minutes } from '@awsless/duration'
import { kebabCase } from 'change-case'
import { z } from 'zod'
import { ConfigRefSchema } from '../../config/schema/config-ref.js'
import { DurationSchema, durationMin } from '../../config/schema/duration.js'
import { EmailSchema } from '../../config/schema/email.js'
import { PhoneSchema } from '../../config/schema/phone.js'

const AlertNameSchema = z
	.string()
	.min(3)
	.max(256)
	.regex(/^[a-z0-9-]+$/i, 'Invalid alert name')
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

export const AlarmsDefaultSchema = z
	.object({
		alert: AlertNameSchema.describe('The alert that hears when an alarm goes off & when it is over.'),
		streamAge: DurationSchema.refine(durationMin(minutes(1)), 'Minimum stream age is 1 minute')
			.optional()
			.describe(
				[
					"An alarm when the oldest record a table stream hasn't handed to its consumer yet is older than this (the bundle's IteratorAge).",
					"All table streams share the event function, so it's one alarm for all of them.",
				].join('\n')
			),
		throttles: z
			.number()
			.int()
			.min(1)
			.optional()
			.describe('An alarm when the event function is throttled this many times or more in a minute.'),
	})
	.strict()
	.optional()
	.describe(
		"CloudWatch alarms on the app's event function, sent to one of the app's alerts by email or text message."
	)

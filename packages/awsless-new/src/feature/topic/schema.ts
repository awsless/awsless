import { paramCase } from 'change-case'
import { z } from 'zod'
import { EmailSchema } from '../../config/schema/email.js'
import { FunctionSchema } from '../function/schema.js'

export const TopicNameSchema = z
	.string()
	.min(3)
	.max(256)
	.regex(/^[a-z0-9\-]+$/i, 'Invalid topic name')
	.transform(value => paramCase(value))
	.describe('Define event topic name.')

export const TopicsSchema = z
	.array(TopicNameSchema)
	.refine(topics => {
		return topics.length === new Set(topics).size
	}, 'Must be a list of unique topic names')
	.optional()
	.describe('Define the event topics to publish too in your stack.')

export const SubscribersSchema = z
	.record(TopicNameSchema, z.union([EmailSchema, FunctionSchema]))
	.optional()
	.describe('Define the event topics to subscribe too in your stack.')

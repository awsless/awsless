import { kebabCase } from 'change-case'
import { z } from 'zod'
import { FunctionSchema } from '../function/schema.js'

export const TopicNameSchema = z
	.string()
	.min(3)
	.max(256)
	.regex(/^[a-z0-9\-]+$/i, 'Invalid topic name')
	.transform(value => kebabCase(value))
	.describe('Define event topic name.')

export const TopicsDefaultSchema = z
	.array(TopicNameSchema)
	.refine(topics => {
		return topics.length === new Set(topics).size
	}, 'Must be a list of unique topic names')
	.optional()
	.describe('Define the event topics for your app.')

export const SubscribersSchema = z
	.record(TopicNameSchema, FunctionSchema)
	.optional()
	.describe('Define the event topics to subscribe too in your stack.')

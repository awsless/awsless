import { parse } from '@awsless/json'
import { FailureSource } from './types'

// Physical resource names look like `app--stack--table--name` for stack
// resources and `app--topic--name` for app level resources.
export const logicalResourceName = (physical: string) => {
	const segments = physical.replace(/\.fifo$/, '').split('--')

	if (segments.length === 4) {
		return `${segments[1]}:${segments[2]}:${segments[3]}`
	}

	if (segments.length === 3) {
		return `${segments[1]}:${segments[2]}`
	}

	return physical
}

// Every consumer shares one bundle function, so the physical function name
// alone does not identify the failed resource. Derive it from the raw
// invocation envelope instead.
export const describeEnvelopeSource = (payload: unknown): FailureSource | undefined => {
	if (!payload || typeof payload !== 'object') {
		return
	}

	const records = (payload as { Records?: unknown }).Records
	const record = Array.isArray(records) ? records[0] : undefined

	if (!record || typeof record !== 'object') {
		return
	}

	const entry = record as Record<string, unknown>
	const sns = entry.Sns as Record<string, unknown> | undefined

	if (sns && typeof sns === 'object') {
		const arn = sns.TopicArn

		return {
			resource: typeof arn === 'string' ? logicalResourceName(arn.split(':').at(-1)!) : 'topic',
			event: parsePayloadValue(sns.Message),
		}
	}

	if (entry.eventSource === 'aws:dynamodb' && typeof entry.eventSourceARN === 'string') {
		const table = entry.eventSourceARN.split('/')[1]

		return {
			resource: table ? logicalResourceName(table) : 'table-stream',
		}
	}

	if (entry.eventSource === 'aws:sqs' && typeof entry.eventSourceARN === 'string') {
		return {
			resource: logicalResourceName(entry.eventSourceARN.split(':').at(-1)!),
			event: parsePayloadValue(entry.body),
		}
	}

	return
}

const parsePayloadValue = (value: unknown) => {
	if (typeof value !== 'string') {
		return value
	}

	try {
		return parse(value)
	} catch {
		return value
	}
}

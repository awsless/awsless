import type {
	CloudWatchAlarmEvent,
	CloudWatchLogsEvent,
	DynamoDBStreamEvent,
	S3Event,
	SNSEvent,
	SQSEvent,
} from 'aws-lambda'

export type SourceMatch =
	| {
			key: string
			payload: unknown
	  }
	| {
			fanout: { key: string; payload: unknown }[]
	  }

// Map a resource name like "app--stack--queue--id" back to the "stack:queue:id" route key.
const parseResourceRoute = (resourceName: string) => {
	return resourceName
		.slice(process.env.APP!.length + 2)
		.split('--')
		.join(':')
}

const routeType = (routeKey: string) => routeKey.split(':')[1]

// Map raw AWS event source events (SQS, S3, DynamoDB streams, SNS,
// CloudWatch alarms & subscribed logs) back onto bundle routes.

export const matchEventSource = (
	event: object,
	topicSubscribers: ReadonlyMap<string, readonly string[]>
): SourceMatch | undefined => {
	const record = (event as Partial<SQSEvent & S3Event & DynamoDBStreamEvent>)?.Records?.[0]

	// Event source mappings tell us the source resource name, which maps directly to a route.
	if (record?.eventSource === 'aws:sqs' && typeof record.eventSourceARN === 'string') {
		// The shared on-failure queue feeds the failure normalizer.
		if (record.eventSourceARN.endsWith(':' + process.env.APP + '--on-failure--failure')) {
			return {
				key: `${process.env.APP}:on-failure:normalizer`,
				payload: event,
			}
		}

		const route = parseResourceRoute(record.eventSourceARN.split(':').at(-1)!.replace(/\.fifo$/, ''))

		if (routeType(route) === 'queue') {
			return {
				key: route,
				payload: event,
			}
		}

		return
	}

	if (record?.eventSource === 'aws:s3') {
		// Store notifications carry their route as the configuration id.
		const route = (record as S3Event['Records'][number]).s3?.configurationId

		if (typeof route === 'string' && routeType(route) === 'store') {
			return {
				key: route,
				payload: event,
			}
		}

		return
	}

	if (record?.eventSource === 'aws:dynamodb' && typeof record.eventSourceARN === 'string') {
		const route = parseResourceRoute(record.eventSourceARN.split('/')[1]!)

		if (routeType(route) === 'table') {
			return {
				key: route,
				payload: event,
			}
		}

		return
	}

	// SNS events can't tell us the route, so we dispatch to every handler subscribed to the topic.
	const snsRecord = (event as Partial<SNSEvent>)?.Records?.[0]

	if (snsRecord?.EventSource === 'aws:sns' && typeof snsRecord.Sns?.TopicArn === 'string') {
		const topicId = snsRecord.Sns.TopicArn.split(':').at(-1)!.split('--').at(-1)!
		const subscribers = topicSubscribers.get(topicId) ?? []

		if (!subscribers.length) {
			throw new Error(`Unknown bundle topic: ${topicId}`)
		}

		if (subscribers.length === 1) {
			return {
				key: subscribers[0]!,
				payload: event,
			}
		}

		// Isolate subscribers in separate invocations so a hard failure in one can't block or retry the others.
		return {
			fanout: subscribers.map(key => ({
				key,
				payload: event,
			})),
		}
	}

	const alarm = event as Partial<CloudWatchAlarmEvent>

	if (alarm?.source === 'aws.cloudwatch' && typeof alarm.alarmArn === 'string') {
		const route = parseResourceRoute(alarm.alarmArn.split(':alarm:').at(-1)!)

		if (routeType(route) === 'metric') {
			return {
				key: route,
				payload: event,
			}
		}

		return
	}

	// The bundle subscribes to its own log group for the on-error-log feature.
	if (typeof (event as Partial<CloudWatchLogsEvent>)?.awslogs?.data === 'string') {
		return {
			key: `${process.env.APP}:on-error-log:handler`,
			payload: event,
		}
	}
}

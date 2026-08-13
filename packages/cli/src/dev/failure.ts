import { stringify } from '@awsless/json'
import { formatRouteKey, formatRoutePayload } from 'awsless'
import { randomUUID } from 'crypto'
import { DevDispatch, DevFailureReport, DevReportFailure } from '../feature.js'

// The bundle route of the global on-failure consumer.
const CONSUMER_ROUTE = formatRouteKey('base', 'on-failure', 'consumer')

// Failed async consumers have no retries locally: the failure goes
// straight to the on-failure consumer when the app has one, with the
// same failure event shapes as the deployed on-failure handler.
export const createFailureReporter = (props: {
	enabled: boolean
	dispatch: DevDispatch
	log: (message: string) => void
}): DevReportFailure => {
	const format = (report: DevFailureReport) => {
		const error = report.error
		const base = {
			id: randomUUID(),
			date: new Date(),
			payload: report.event,
		}

		// The deployed queue failure comes off a dlq message that carries
		// no error details, so the local shape matches exactly - the
		// function failure shapes do carry the error.
		const errorDetail = {
			error: {
				type: error instanceof Error ? error.name : 'Error',
				message: error instanceof Error ? error.message : String(error),
				stackTrace: error instanceof Error && error.stack ? error.stack.split('\n') : undefined,
			},
		}

		if (report.kind === 'queue') {
			return {
				...base,
				type: 'queue',
				source: report.routeKey ? { resource: report.routeKey, event: report.event } : undefined,
				queue: report.queue,
			}
		}

		if (report.kind === 'stream') {
			return {
				...base,
				...errorDetail,
				type: 'dynamodb-stream',
				function: { name: report.routeKey ?? 'bundle' },
				source: report.routeKey ? { resource: report.routeKey } : undefined,
			}
		}

		return {
			...base,
			...errorDetail,
			type: 'async-lambda',
			function: { name: report.routeKey ?? 'bundle' },
			source: report.routeKey ? { resource: report.routeKey, event: report.event } : undefined,
		}
	}

	return report => {
		const message = report.error instanceof Error ? report.error.message : String(report.error)

		props.log(`${report.routeKey ?? report.queue?.name ?? 'async invoke'} failed: ${message}`)

		if (!props.enabled) {
			return
		}

		// Round trip through the json codec, so typed values arrive at
		// the consumer exactly like the deployed failure handler sends
		// them.
		const event = JSON.parse(stringify(format(report)))

		props
			.dispatch(formatRoutePayload(CONSUMER_ROUTE, event))
			.catch(error => {
				props.log(
					`The on-failure consumer itself failed: ${
						error instanceof Error ? error.message : String(error)
					}`
				)
			})
	}
}

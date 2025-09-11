import { CloudWatchClient, MetricDatum, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'
import { cloudWatchClient } from '../client'

export type BatchPutDataProps = {
	client?: CloudWatchClient
}

export const batchPutData = async <N extends string>(
	data: {
		batchable(): {
			namespace: N
			datum: MetricDatum
		}
	}[],
	{ client = cloudWatchClient() }: BatchPutDataProps = {}
) => {
	const entries = data.map(i => i.batchable())
	const namespaces = entries.map(i => i.namespace)

	if (new Set(namespaces).size > 1) {
		throw new TypeError(`Batching for multiple namespaces isn't supported`)
	}

	await client.send(
		new PutMetricDataCommand({
			Namespace: namespaces[0],
			MetricData: entries.map(i => i.datum),
		})
	)
}

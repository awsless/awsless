import { CloudWatchClient, MetricDatum, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'
import { cloudWatchClient } from '../client'
import { toStandedUnit } from '../util/unit'
import { thenable } from './command'
import { Metric } from './create-metric'

export type PutDataProps = {
	client?: CloudWatchClient
	dimentions?: Record<string, string>
	time?: Date
}

export const putData = <T>(
	metric: Metric<T>,
	value: T | T[],
	{ time, dimentions = {}, client = cloudWatchClient() }: PutDataProps = {}
) => {
	const datum: MetricDatum = {
		MetricName: metric.name,
		Unit: toStandedUnit(metric.unit),
		Timestamp: time,
		StorageResolution: metric.resolution === 'high' ? 1 : 60,
		Values: (Array.isArray(value) ? value : [value]).map(metric.decode),
		Dimensions: Object.entries(dimentions).map(([name, value]) => ({
			Name: name,
			Value: value,
		})),
	}

	return {
		batchable: () => ({
			namespace: metric.namespace,
			datum,
		}),
		...thenable(async () => {
			await client.send(
				new PutMetricDataCommand({
					Namespace: metric.namespace,
					MetricData: [datum],
				})
			)
		}),
	}
}

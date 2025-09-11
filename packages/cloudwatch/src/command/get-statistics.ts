import { CloudWatchClient, GetMetricStatisticsCommand, Statistic } from '@aws-sdk/client-cloudwatch'
import { Duration, toSeconds } from '@awsless/duration'
import { cloudWatchClient } from '../client'
import { DisplayUnit, toStandedUnit } from '../util/unit'
import { Metric } from './create-metric'

export type GetStatisticsProps = {
	start: Date
	end: Date
	period: Duration
	unit?: DisplayUnit
	dimentions?: Record<string, string>
	client?: CloudWatchClient
}

export const getStatistics = async <T>(
	metric: Metric<T>,
	{ start, end, period, unit, dimentions = {}, client = cloudWatchClient() }: GetStatisticsProps
) => {
	const differentDisplayUnit = unit && unit !== metric.unit
	const isPercent = (unit ?? metric.unit) === 'percent'
	const stats: { ExtendedStatistics: string[] } | { Statistics: Statistic[] } = isPercent
		? { ExtendedStatistics: ['p50', 'p75', 'p95', 'p90', 'p99', 'p100'] }
		: { Statistics: ['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum'] }

	const result = await client.send(
		new GetMetricStatisticsCommand({
			...stats,
			Namespace: metric.namespace,
			MetricName: metric.name,
			Unit: toStandedUnit(unit ?? metric.unit),
			Period: toSeconds(period),
			EndTime: end,
			StartTime: start,
			Dimensions: Object.entries(dimentions).map(([name, value]) => ({
				Name: name,
				Value: value,
			})),
		})
	)

	const encode = (value?: number) => {
		if (!differentDisplayUnit && typeof value === 'number') {
			return metric.encode(value)
		}

		return value
	}

	const points = result.Datapoints ?? []

	if (isPercent) {
		return points.map(value => ({
			time: value.Timestamp,
			p50: value.ExtendedStatistics?.p50,
			p75: value.ExtendedStatistics?.p75,
			p95: value.ExtendedStatistics?.p95,
			p90: value.ExtendedStatistics?.p90,
			p99: value.ExtendedStatistics?.p99,
			p100: value.ExtendedStatistics?.p100,
			count: encode(value.SampleCount),
		}))
	}

	return points.map(value => ({
		time: value.Timestamp,
		average: encode(value.Average),
		min: encode(value.Minimum),
		max: encode(value.Maximum),
		sum: encode(value.Sum),
		count: encode(value.SampleCount),
	}))
}

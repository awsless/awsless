export { mockCloudWatch } from './mock'
export { cloudWatchClient } from './client'

export {
	createMetric,
	createDurationMetric,
	createSizeMetric,
	type CreateMetricProps,
	type Metric,
} from './command/create-metric'
export { putData, type PutDataProps } from './command/put-metric-data'
export { batchPutData, type BatchPutDataProps } from './command/batch-put-metric-data'
export { getStatistics, type GetStatisticsProps } from './command/get-statistics'

export { type Unit } from './util/unit'

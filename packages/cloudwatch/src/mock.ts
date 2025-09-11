import {
	CloudWatchClient,
	GetMetricStatisticsCommand,
	GetMetricStatisticsCommandInput,
	PutMetricDataCommand,
	PutMetricDataCommandInput,
} from '@aws-sdk/client-cloudwatch'
import { mockClient } from 'aws-sdk-client-mock'

export const mockCloudWatch = () => {
	// @ts-ignore
	mockClient(CloudWatchClient)
		// @ts-ignore
		.on(PutMetricDataCommand)
		.callsFake((_input: PutMetricDataCommandInput) => {
			// --------------------------------------------------------
			// We could at some point store the metric data to
			// produce somewhat accurate statistic data.
			// Maybe by starting up a local version of a timeseries db.
			// --------------------------------------------------------
		})
		// @ts-ignore
		.on(GetMetricStatisticsCommand)
		.callsFake((_input: GetMetricStatisticsCommandInput) => {
			// console.log(input)
			return {
				Datapoints: [],
			}
		})
}

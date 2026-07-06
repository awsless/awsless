import { milliSeconds } from '@awsless/duration'
import { bytes } from '@awsless/size'
import { Metric, mockMetric } from '../../../src/server'

describe('Metric', () => {
	mockMetric()

	it('number', async () => {
		await Metric.stack.size.put(1)
	})

	it('size', async () => {
		await Metric.stack.size.put(bytes(1))
	})

	it('duration', async () => {
		await Metric.stack.size.put(milliSeconds(1))
	})
})

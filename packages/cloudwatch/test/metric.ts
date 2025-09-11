import { hours } from '@awsless/duration'
import { batchPutData, createMetric, getStatistics, mockCloudWatch, putData } from '../src'

describe('CloudWatch', () => {
	mockCloudWatch()

	const metric = createMetric({
		namespace: 'dynamodb',
		name: 'latency',
	})

	it('should log metric data', async () => {
		await putData(metric, 1)
	})

	it('should log metric data with dimention', async () => {
		await putData(metric, 1, {
			dimentions: {
				stage: 'prod',
				tableName: 'table-1',
			},
		})
	})

	it('should batch log metric data', async () => {
		await batchPutData([
			//
			putData(metric, 1),
			putData(metric, 1),
			putData(metric, 1),
		])
	})

	it('should throw for batching multiple namespaces', async () => {
		const other = createMetric({
			namespace: 'other',
			name: 'custom',
		})

		await expect(
			batchPutData([
				//
				putData(metric, 1),
				putData(metric, 1),
				putData(other, 1),
			])
		).rejects.toThrow(TypeError)
	})

	it('should get statistics', async () => {
		const result = await getStatistics(metric, {
			start: new Date('2000-01-01'),
			end: new Date('2000-01-02'),
			period: hours(1),
		})

		expect(result).toStrictEqual([])
	})
})

import {
	batchPutData,
	createDurationMetric,
	createMetric,
	createSizeMetric,
	putData,
	type CreateMetricProps,
	type PutDataProps,
	type Metric as TMetric,
	type Unit,
} from '@awsless/cloudwatch'
import { constantCase, kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { APP, STACK } from './util.js'

export const getMetricName = (name: string) => {
	return kebabCase(name)
}

export const getMetricNamespace = (stack: string = STACK, app: string = APP) => {
	return `awsless/${kebabCase(app)}/${kebabCase(stack)}`
}

export interface MetricResources {}

export const Metric: MetricResources = /*@__PURE__*/ createProxy(stack => {
	if (stack === 'batch') {
		return batchPutData
	}

	return createProxy(metricName => {
		const name = getMetricName(metricName)
		const namespace = getMetricNamespace(stack)
		const unit = process.env[`METRIC_${constantCase(metricName)}`] as Unit | undefined

		if (!unit) {
			throw new TypeError(`Metric "${name}" isn't defined in your stack.`)
		}

		const factories: Record<Unit, (props: CreateMetricProps) => TMetric<any>> = {
			number: createMetric,
			size: createSizeMetric,
			duration: createDurationMetric,
		}

		const metric = factories[unit]({
			name,
			namespace,
		})

		return {
			name,
			namespace,
			unit,
			put(value: any, options?: PutDataProps) {
				return putData(metric, value, options)
			},
		}
	})
})

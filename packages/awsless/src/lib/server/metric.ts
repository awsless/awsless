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
import { getApp, getStack, isTest } from './util.js'

export const getMetricName = (name: string) => {
	return kebabCase(name)
}

export const getMetricNamespace = (stack: string = getStack(), app: string = getApp()) => {
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
		const unit = process.env[`METRIC_${constantCase(stack)}_${constantCase(metricName)}`] as Unit | undefined

		let metric: TMetric<any>

		if (!unit && !isTest()) {
			throw new TypeError(`Metric "${name}" isn't defined in your stack.`)
		} else if (!unit) {
			// Tests record metrics into the void, so no unit is needed.
			metric = createMetric({ name, namespace })
		} else {
			const factories: Record<Unit, (props: CreateMetricProps) => TMetric<any>> = {
				number: createMetric,
				size: createSizeMetric,
				duration: createDurationMetric,
			}

			metric = factories[unit]({
				name,
				namespace,
			})
		}

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

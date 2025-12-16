import { Metric } from '../../../src/server'

export default async () => {
	await Metric.stack.size.put(1)

	console.log('log size metric', 1)
}

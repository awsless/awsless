import { mockCloudWatch, type Unit } from '@awsless/cloudwatch'
import { constantCase } from 'change-case'

// The cli puts the unit of every declared metric in the environment, so tests
// declare theirs the same way & hit the same validation as production.
export const mockMetric = (metrics: Record<string, Record<string, Unit>> = {}) => {
	for (const [stack, names] of Object.entries(metrics)) {
		for (const [name, unit] of Object.entries(names)) {
			process.env[`METRIC_${constantCase(stack)}_${constantCase(name)}`] = unit
		}
	}

	return mockCloudWatch()
}

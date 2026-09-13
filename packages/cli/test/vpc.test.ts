import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

describe('vpc', () => {
	it('creates a dual-stack vpc with private & public subnets', () => {
		const { app, shared } = createTestApp()

		const subnets = listResources(app, 'aws_subnet')

		expect(listResources(app, 'aws_vpc')).toHaveLength(1)
		expect(subnets.length).toBeGreaterThan(0)
		expect(subnets.length % 2).toBe(0)
		expect(listResources(app, 'aws_nat_gateway')).toHaveLength(1)
		expect(listResources(app, 'aws_internet_gateway')).toHaveLength(1)

		expect(shared.get('vpc', 'private-subnets')).toHaveLength(subnets.length / 2)
		expect(shared.get('vpc', 'public-subnets')).toHaveLength(subnets.length / 2)
		expect(shared.get('vpc', 'security-group-id')).toBeDefined()
	})
})

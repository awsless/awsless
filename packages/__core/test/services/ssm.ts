
import { describe, it } from 'vitest'
import { ssm } from '../../src'
import { mockSSM } from '@heat/aws-test'

describe('SSM', () => {

	mockSSM({
		'/test': 'resolved'
	})

	it('should resolve ssm paths', async () => {
		const result = await ssm({
			paths: {
				test: '/test'
			}
		})

		expect(result).toStrictEqual({
			test: 'resolved'
		})
	})

})

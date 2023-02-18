
import { describe, it } from 'vitest'
import { publish } from '../../src'
import { mockIoT } from '@heat/aws-test'

describe('IoT', () => {

	const mock = mockIoT()

	it('should publish IoT message', async () => {
		await publish({
			topic: 'test',
			event: 'test',
			value: 'test'
		})

		expect(mock).toBeCalledTimes(1)
	})
})

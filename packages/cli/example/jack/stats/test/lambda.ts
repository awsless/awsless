import { BigFloat } from '@awsless/big-float'
import get from '../src/function/get'
import log from '../src/task/log'

describe('Stats', () => {
	it('log', async () => {
		await log({ name: 'test', value: 1 })
	})

	it('get', async () => {
		const result = await get('test')
		expect(result).toStrictEqual(new BigFloat(1))
	})
})

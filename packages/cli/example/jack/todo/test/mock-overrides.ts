import { mock, Task } from 'awsless'

// A module scope override forms the baseline every test starts from -
// it must survive across tests, like the old mock registrations did.
mock.task.stats.log(() => 'baseline')

describe('mock overrides', () => {
	it('uses the module scope override', async () => {
		await Task.stats.log({ event: 'a' })

		expect(mock.task.stats.log).toHaveReturnedWith('baseline')
	})

	it('an in-test override wins inside its test', async () => {
		mock.task.stats.log(() => 'temporary')

		await Task.stats.log({ event: 'b' })

		expect(mock.task.stats.log).toHaveReturnedWith('temporary')
	})

	it('the baseline returns after the overriding test', async () => {
		await Task.stats.log({ event: 'c' })

		expect(mock.task.stats.log).toHaveReturnedWith('baseline')
		expect(mock.task.stats.log).not.toHaveReturnedWith('temporary')
	})
})

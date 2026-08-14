import { mock, Task } from 'awsless'

// A module scope override forms the baseline every test starts from -
// it must survive across tests, like the old mock registrations did.
const seen: string[] = []

mock.task.stats.log(() => {
	seen.push('baseline')
})

describe('mock overrides', () => {
	it('uses the module scope override', async () => {
		await Task.stats.log({ name: 'tasks', value: 1 })

		expect(seen).toStrictEqual(['baseline'])
	})

	it('an in-test override wins inside its test', async () => {
		mock.task.stats.log(() => {
			seen.push('temporary')
		})

		await Task.stats.log({ name: 'tasks', value: 2 })

		expect(seen.at(-1)).toBe('temporary')
	})

	it('the baseline returns after the overriding test', async () => {
		await Task.stats.log({ name: 'tasks', value: 3 })

		expect(seen.at(-1)).toBe('baseline')
	})
})

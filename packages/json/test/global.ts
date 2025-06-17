import { $mockdate, parse, setGlobalTypes, stringify } from '../src'

describe('global', () => {
	describe('mockdate', () => {
		it('setGlobalTypes', () => {
			setGlobalTypes({
				$mockdate,
			})

			vi.setSystemTime(new Date('2000-01-01'))
		})

		it('stringify', () => {
			const result = stringify(new Date())
			expect(result).toBe('{"$mockdate":"2000-01-01T00:00:00.000Z"}')
		})

		it('parse', () => {
			const result = parse(stringify(new Date()))
			expect(result).toStrictEqual(new Date())
		})
	})
})


import { Config } from "../src/index.js";

const TestConfig = Config as { TEST: string }

describe('config', () => {
	it('throw for unset config value', () => {
		expect(() => TestConfig.TEST).toThrow(Error)
	})

	it('set config value', () => {
		TestConfig.TEST = 'foo'
	})

	it('get config value', () => {
		expect(TestConfig.TEST).toBe('foo')
	})
})

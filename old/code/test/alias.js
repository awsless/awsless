import { join } from 'path'
import { bundle } from '../src'

describe('Code', () => {
	const testPath = (dir, file = 'index.js') => {
		return join(process.cwd(), 'test/data', dir, file)
	}

	it('should support tsconfig alias paths', async () => {
		const path = testPath('alias')
		const result = await bundle(path)
		expect(result.code).toContain("return 'alias'")
	})
})

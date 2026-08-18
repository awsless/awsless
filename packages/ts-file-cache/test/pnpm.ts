import { readFile } from 'fs/promises'
import { join } from 'path'
import { pnpm } from '../src/package-manager/pnpm'

describe('PNPM', () => {
	it('should load package dependency versions', async () => {
		const cwd = join(__dirname, '../../..')
		const lockFile = await readFile(join(cwd, 'pnpm-lock.yaml'), 'utf8')
		const workspace = await pnpm(cwd, lockFile)

		expect(workspace.cwd).toBe(cwd)
		expect(workspace.packages).toBeDefined()
		expect(Object.values(workspace.packages).find(p => p.name === '@awsless/ts-file-cache')).toBeDefined()
	})
})

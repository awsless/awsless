import { pnpm } from '../src/package-manager/pnpm'

describe('PNPM', () => {
	it('should load package dependency versions', async () => {
		const workspace = await pnpm('.')

		expect(workspace.cwd).toBe('../..')
		expect(workspace.packages).toBeDefined()
		expect(workspace.packages['@awsless/ts-file-cache']).toBeDefined()
	})
})

import { join } from 'path'
import { generateFileHash, loadWorkspace } from '../src'

const fixture = join(__dirname, '_fixture/bun')

describe('Bun', () => {
	it('should load a bun workspace', async () => {
		const workspace = await loadWorkspace(fixture)

		expect(workspace.cwd).toBe(fixture)

		const app = workspace.packages[join(fixture, 'packages/app')]

		expect(app).toBeDefined()
		expect(app!.name).toBe('@fixture/app')
		expect(app!.dependencies['yaml']).toStrictEqual({
			type: 'package',
			version: '2.9.0',
		})
		expect(app!.dependencies['@fixture/lib']).toStrictEqual({
			type: 'workspace',
			link: join(fixture, 'packages/lib'),
		})
	})

	it('should hash a file inside a bun workspace', async () => {
		const workspace = await loadWorkspace(fixture)
		const hash = await generateFileHash(workspace, join(fixture, 'packages/app/_index.ts'))

		expect(hash).toHaveLength(40)
	})
})

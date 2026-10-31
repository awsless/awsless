import { join } from 'path'
import { generateRecursiveFileHashes } from '../src/hash'
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
			treeHash: workspace.lockfileHash,
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

	it("should hash the file a workspace package's subpath export names", async () => {
		const workspace = await loadWorkspace(fixture)
		const file = join(fixture, 'packages/app/_extra.ts')
		const hashes = new Map<string, Buffer>()

		await generateRecursiveFileHashes(workspace, file, file, ['ts'], hashes)

		expect([...hashes.keys()]).toContain('packages/lib/_extra.ts')
		expect([...hashes.keys()]).not.toContain('packages/lib/_index.ts')
	})
})

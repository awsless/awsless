import { generateFileHash, generateFolderHash, loadWorkspace } from '../src'
import { Workspace } from '../src/types'

describe('Hash', () => {
	let workspace: Workspace

	it('should load workspace', async () => {
		workspace = await loadWorkspace('../..')

		expect(workspace.packages['@awsless/ts-file-cache']).toBeDefined()
	})

	it('should hash a relative file', async () => {
		const hash = await generateFileHash(workspace, './src/index.ts')
		expect(hash).toBe('bff8aab198c7c24c25ea23b9cee6101d22a90b18')
	})

	it('should hash a absolute file', async () => {
		const hash = await generateFileHash(workspace, __dirname + '/../src/index.ts')
		expect(hash).toBe('bff8aab198c7c24c25ea23b9cee6101d22a90b18')
	})

	it('should hash a relative folder', async () => {
		const hash = await generateFolderHash(workspace, './src')
		expect(hash).toBe('bff8aab198c7c24c25ea23b9cee6101d22a90b18')
	})

	it('should hash a absolute folder', async () => {
		const hash = await generateFolderHash(workspace, process.cwd() + '/src')
		expect(hash).toBe('bff8aab198c7c24c25ea23b9cee6101d22a90b18')
	})
})

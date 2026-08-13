import { generateFileHash, generateFolderHash, loadWorkspace } from '../src'
import { Workspace } from '../src/types'

describe('Hash', () => {
	let workspace: Workspace

	it('should load workspace', async () => {
		workspace = await loadWorkspace('../..')

		expect(Object.values(workspace.packages).find(p => p.name === '@awsless/ts-file-cache')).toBeDefined()
	})

	it('should hash a relative file', async () => {
		const hash = await generateFileHash(workspace, './src/index.ts')
		expect(hash).toBe('2c9f89c047c16cc325357f02c4aa1bc0f7f56032')
	})

	it('should hash a absolute file', async () => {
		const hash = await generateFileHash(workspace, __dirname + '/../src/index.ts')
		expect(hash).toBe('2c9f89c047c16cc325357f02c4aa1bc0f7f56032')
	})

	it('should hash a relative folder', async () => {
		const hash = await generateFolderHash(workspace, './src')
		expect(hash).toBe('2c9f89c047c16cc325357f02c4aa1bc0f7f56032')
	})

	it('should hash a absolute folder', async () => {
		const hash = await generateFolderHash(workspace, process.cwd() + '/src')
		expect(hash).toBe('2c9f89c047c16cc325357f02c4aa1bc0f7f56032')
	})
})

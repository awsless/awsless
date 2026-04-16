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
		expect(hash).toBe('2f773666c9a5cdd35cb4c18508c90ab8d1df4906')
	})

	it('should hash a absolute file', async () => {
		const hash = await generateFileHash(workspace, __dirname + '/../src/index.ts')
		expect(hash).toBe('2f773666c9a5cdd35cb4c18508c90ab8d1df4906')
	})

	it('should hash a relative folder', async () => {
		const hash = await generateFolderHash(workspace, './src')
		expect(hash).toBe('2f773666c9a5cdd35cb4c18508c90ab8d1df4906')
	})

	it('should hash a absolute folder', async () => {
		const hash = await generateFolderHash(workspace, process.cwd() + '/src')
		expect(hash).toBe('2f773666c9a5cdd35cb4c18508c90ab8d1df4906')
	})
})

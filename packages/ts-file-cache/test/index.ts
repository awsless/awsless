import { generateFileHash, generateFolderHash, loadWorkspace } from '../src'
import { Workspace } from '../src/types'

// Hashes include dependency versions, so exact pins would break on
// every dependency change - assert behavior instead.
describe('Hash', () => {
	let workspace: Workspace
	let fileHash: string

	it('should load workspace', async () => {
		workspace = await loadWorkspace('../..')

		expect(Object.values(workspace.packages).find(p => p.name === '@awsless/ts-file-cache')).toBeDefined()
		expect(workspace.lockfileHash).toMatch(/^[0-9a-f]{40}$/)
	})

	it('should hash a relative file', async () => {
		fileHash = await generateFileHash(workspace, './src/index.ts')

		expect(fileHash).toMatch(/^[0-9a-f]{40}$/)
	})

	it('should hash deterministically', async () => {
		const hash = await generateFileHash(workspace, './src/index.ts')

		expect(hash).toBe(fileHash)
	})

	it('should hash a absolute file', async () => {
		const hash = await generateFileHash(workspace, __dirname + '/../src/index.ts')

		expect(hash).toBe(fileHash)
	})

	it('should hash a relative folder', async () => {
		const hash = await generateFolderHash(workspace, './src')

		expect(hash).toBe(fileHash)
	})

	it('should hash a absolute folder', async () => {
		const hash = await generateFolderHash(workspace, process.cwd() + '/src')

		expect(hash).toBe(fileHash)
	})

	it('should ignore lockfile changes outside every dependency subtree', async () => {
		const changed = await generateFileHash({ ...workspace, lockfileHash: '0'.repeat(40) }, './src/index.ts')

		expect(changed).toBe(fileHash)
	})
})

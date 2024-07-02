import { generateFileHash, generateFolderHash, loadPackageDependencyVersions } from '../src'

describe('Hash', () => {
	const packageVersions = {
		'parse-static-imports': '1.1.0',
	}

	it('should load package dependency versions', async () => {
		const versions = await loadPackageDependencyVersions('.', {
			packageManager: 'pnpm',
		})

		expect(versions).toStrictEqual(packageVersions)
	})

	it('should hash a relative file', async () => {
		const hash = await generateFileHash('./src/index.ts', { packageVersions })
		expect(hash).toBe('d04aa19bb87ad9333d0fdd8fb21cd6cd93247dbb')
	})

	it('should hash a absolute file', async () => {
		const hash = await generateFileHash(__dirname + '/../src/index.ts', { packageVersions })
		expect(hash).toBe('d04aa19bb87ad9333d0fdd8fb21cd6cd93247dbb')
	})

	it('should hash a relative folder', async () => {
		const hash = await generateFolderHash('./src', { packageVersions })
		expect(hash).toBe('d04aa19bb87ad9333d0fdd8fb21cd6cd93247dbb')
	})

	it('should hash a absolute folder', async () => {
		const hash = await generateFolderHash(process.cwd() + '/src', { packageVersions })
		expect(hash).toBe('d04aa19bb87ad9333d0fdd8fb21cd6cd93247dbb')
	})
})

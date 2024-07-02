import { generateFileHash, generateFolderHash, loadPackageDependencyVersions } from '../src'

describe('Hash', () => {
	const packageVersions = {
		'parse-static-imports': '1.1.0',
	}

	it('should load package dependency versions', async () => {
		const versions = await loadPackageDependencyVersions('.', 'pnpm')
		expect(versions).toStrictEqual(packageVersions)
	})

	it('should hash a relative file', async () => {
		const hash = await generateFileHash('./src/index.ts', { packageVersions })
		expect(hash).toBe('285f140854df95788f9579e945a613434ba19388')
	})

	it('should hash a absolute file', async () => {
		const hash = await generateFileHash(__dirname + '/../src/index.ts', { packageVersions })
		expect(hash).toBe('285f140854df95788f9579e945a613434ba19388')
	})

	it('should hash a relative folder', async () => {
		const hash = await generateFolderHash('./src', { packageVersions })
		expect(hash).toBe('285f140854df95788f9579e945a613434ba19388')
	})

	it('should hash a absolute folder', async () => {
		const hash = await generateFolderHash(process.cwd() + '/src', { packageVersions })
		expect(hash).toBe('285f140854df95788f9579e945a613434ba19388')
	})
})

import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { generateFileHash } from '../src'
import { pnpm } from '../src/package-manager/pnpm'

const sha1 = (content: string) => createHash('sha1').update(content).digest('hex')

describe('PNPM', () => {
	it('should load package dependency versions', async () => {
		const cwd = join(__dirname, '../../..')
		const lockFile = await readFile(join(cwd, 'pnpm-lock.yaml'), 'utf8')
		const workspace = await pnpm(cwd, lockFile, sha1(lockFile))

		expect(workspace.cwd).toBe(cwd)
		expect(workspace.packages).toBeDefined()
		expect(Object.values(workspace.packages).find(p => p.name === '@awsless/ts-file-cache')).toBeDefined()
	})

	describe('per package cache busting', () => {
		const fixture = join(__dirname, '_fixture/pnpm')
		const appA = join(fixture, 'packages/app-a/_index.ts')
		const appB = join(fixture, 'packages/app-b/_index.ts')

		const load = async (mutate?: (lockFile: string) => string) => {
			let lockFile = await readFile(join(fixture, 'pnpm-lock.yaml'), 'utf8')

			if (mutate) {
				lockFile = mutate(lockFile)
			}

			const workspace = { ...(await pnpm(fixture, lockFile, sha1(lockFile))), lockfileHash: sha1(lockFile) }

			return {
				hashA: await generateFileHash(workspace, appA),
				hashB: await generateFileHash(workspace, appB),
			}
		}

		it('should only bust the package that bumped its dependency', async () => {
			const base = await load()
			const bumped = await load(lockFile =>
				lockFile.replace('version: 1.2.0', 'version: 1.3.0').replace('alpha@1.2.0:', 'alpha@1.3.0:')
			)

			expect(bumped.hashA).not.toBe(base.hashA)
			expect(bumped.hashB).toBe(base.hashB)
		})

		it('should bust on a transitive dependency update', async () => {
			const base = await load()
			const bumped = await load(lockFile =>
				lockFile.replace('gamma: 3.1.0', 'gamma: 3.2.0').replace('gamma@3.1.0:', 'gamma@3.2.0:')
			)

			expect(bumped.hashA).toBe(base.hashA)
			expect(bumped.hashB).not.toBe(base.hashB)
		})

		it('should ignore lockfile changes outside every dependency subtree', async () => {
			const base = await load()
			const bumped = await load(lockFile => lockFile.replace('typescript@5.9.2:', 'typescript@5.9.3:'))

			expect(bumped.hashA).toBe(base.hashA)
			expect(bumped.hashB).toBe(base.hashB)
		})
	})
})

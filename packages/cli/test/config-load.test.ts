import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { loadAppConfig, loadStackConfigs } from '../src/config/load/load'
import { directories, findRootDir, setRoot } from '../src/util/path'

const write = async (file: string, data: unknown) => {
	await mkdir(join(file, '..'), { recursive: true })
	await writeFile(file, JSON.stringify(data))
}

describe('config loading', () => {
	let root: string
	let outside: string

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'awsless-config-'))
		outside = await mkdtemp(join(tmpdir(), 'awsless-outside-'))

		await write(join(root, 'app.json'), { name: 'test-app', region: 'us-east-1', profile: 'test' })
		await write(join(root, 'stacks/aa/stack.json'), { name: 'aa' })
		await write(join(root, 'stacks/bb.stack.json'), { name: 'bb' })
		await write(join(root, 'stacks/_draft/stack.json'), { name: 'draft' })
		await write(join(root, 'stacks/_draft/cc.stack.json'), { name: 'cc' })
		await mkdir(join(root, 'nested/deep'), { recursive: true })
	})

	afterAll(async () => {
		await rm(root, { recursive: true, force: true })
		await rm(outside, { recursive: true, force: true })
	})

	afterEach(() => {
		vi.restoreAllMocks()
		setRoot()
	})

	it('should find the app config by walking up from a nested directory', async () => {
		await expect(findRootDir(join(root, 'nested/deep'), ['app.json', 'app.jsonc'])).resolves.toEqual([
			join(root, 'app.json'),
			root,
		])
	})

	it('should give up walking after a few levels', async () => {
		await expect(findRootDir(join(root, 'nested/deep'), ['app.json'], 2)).rejects.toThrow(
			'No awsless project found'
		)
	})

	it('should load the app config from a nested working directory', async () => {
		vi.spyOn(process, 'cwd').mockReturnValue(join(root, 'nested/deep'))

		const appConfig = await loadAppConfig({})

		expect(appConfig.name).toBe('test-app')
		expect(directories.root).toBe(root)
	})

	it('should resolve a relative --config-file against the working directory', async () => {
		vi.spyOn(process, 'cwd').mockReturnValue(join(root, 'nested'))

		const appConfig = await loadAppConfig({ configFile: '../app.json' })

		expect(appConfig.name).toBe('test-app')
		expect(directories.root).toBe(root)
	})

	it('should accept an absolute --config-file from anywhere', async () => {
		vi.spyOn(process, 'cwd').mockReturnValue(outside)

		const appConfig = await loadAppConfig({ configFile: join(root, 'app.json') })

		expect(appConfig.name).toBe('test-app')
		expect(directories.root).toBe(root)
	})

	it('should skip stack files inside underscore prefixed folders', async () => {
		vi.spyOn(process, 'cwd').mockReturnValue(root)

		await loadAppConfig({})
		const stacks = await loadStackConfigs({})

		expect(stacks.map(stack => stack.name)).toEqual(['aa', 'bb'])
		expect(stacks.map(stack => stack.file)).toEqual(['stacks/aa/stack.json', 'stacks/bb.stack.json'])
	})
})

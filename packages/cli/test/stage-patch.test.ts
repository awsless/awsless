import JSON5 from 'json5'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { AppSchema } from '../src/config/app.js'
import { loadAppConfig, loadStackConfigs } from '../src/config/load/load.js'
import { JsonSchema, createStagePatchJsonSchema } from '../src/config/stage-patch-json-schema.js'

const createWorkspace = async () => {
	const root = await mkdtemp(join(tmpdir(), 'awsless-v3-stage-patch-'))

	await mkdir(join(root, 'api'))
	await writeFile(
		join(root, 'app.jsonc'),
		JSON.stringify({
			name: 'demo',
			region: 'us-east-1',
			profile: 'default',
			configs: ['core'],
		})
	)
	await writeFile(
		join(root, 'api', 'stack.jsonc'),
		JSON.stringify({
			name: 'api',
		})
	)

	return root
}

const withWorkspace = async <Result>(callback: (root: string) => Promise<Result>) => {
	const cwd = process.cwd()
	const root = await createWorkspace()

	try {
		process.chdir(root)
		return await callback(root)
	} finally {
		process.chdir(cwd)
		await rm(root, { recursive: true, force: true })
	}
}

const expectStageFileError = async (promise: Promise<unknown>, file: string) => {
	const resolved = await realpath(file)

	await expect(promise).rejects.toMatchObject({
		file: resolved,
	})
}

type OperationSchema = {
	properties?: Record<string, JsonSchema>
	allOf?: Array<{
		if?: JsonSchema
		then?: JsonSchema
	}>
}

const getOperationSchemas = (schema: JsonSchema): OperationSchema[] => {
	const operations = schema.properties?.operations
	if (!operations || typeof operations !== 'object') {
		return []
	}

	const items = operations.items
	if (!items || typeof items !== 'object' || !('oneOf' in items) || !Array.isArray(items.oneOf)) {
		return []
	}

	return items.oneOf as OperationSchema[]
}

const findOperationSchema = (operations: OperationSchema[], op: string) => {
	return operations.find(schema => schema.properties?.op?.const === op)
}

const findConditionalValueSchema = (operation: OperationSchema | undefined, path: string) => {
	return operation?.allOf?.find(rule => {
		const matcher = rule.if?.properties?.path
		return matcher?.const === path || matcher?.pattern === path
	})?.then?.properties?.value
}

beforeAll(() => {
	;(globalThis as typeof globalThis & { Bun?: { JSON5: { parse: typeof JSON5.parse } } }).Bun = {
		JSON5: {
			parse: JSON5.parse,
		},
	}
})

describe('stage patch config loading', () => {
	it('applies app stage patches and validates the result', async () => {
		await withWorkspace(async root => {
			await writeFile(
				join(root, 'app.prod.jsonc'),
				JSON.stringify({
					$schema: './dist/app.stage.json',
					operations: [
						{ op: 'test', path: '/region', value: 'us-east-1' },
						{ op: 'replace', path: '/profile', value: 'prod' },
						{ op: 'add', path: '/protect', value: true },
					],
				})
			)

			const app = await loadAppConfig({
				configFile: './app.jsonc',
				stage: 'prod',
			})

			expect(app.profile).toBe('prod')
			expect(app.protect).toBe(true)
		})
	})

	it('applies full RFC 6902 stage patches', async () => {
		await withWorkspace(async root => {
			await writeFile(
				join(root, 'app.prod.jsonc'),
				JSON.stringify({
					$schema: './dist/app.stage.json',
					operations: [
						{ op: 'copy', from: '/name', path: '/configs/1' },
						{ op: 'move', from: '/configs/1', path: '/configs/0' },
						{ op: 'remove', path: '/configs/1' },
						{ op: 'test', path: '/configs/0', value: 'demo' },
						{ op: 'add', path: '/configs/1', value: 'worker' },
					],
				})
			)
			await writeFile(
				join(root, 'api', 'stack.prod.jsonc'),
				JSON.stringify({
					$schema: '../../dist/stack.stage.json',
					operations: [{ op: 'replace', path: '/name', value: 'jobs' }],
				})
			)

			const app = await loadAppConfig({
				configFile: './app.jsonc',
				stage: 'prod',
			})

			const stacks = await loadStackConfigs({
				configFile: './app.jsonc',
				stage: 'prod',
			})

			expect(app.configs).toEqual(['demo', 'worker'])
			expect(stacks).toHaveLength(1)
			expect(stacks[0]?.name).toBe('jobs')
		})
	})

	it('reports invalid patch paths against the stage file', async () => {
		await withWorkspace(async root => {
			await writeFile(
				join(root, 'app.prod.jsonc'),
				JSON.stringify({
					operations: [{ op: 'replace', path: '/missing/path', value: 'prod' }],
				})
			)

			await expectStageFileError(
				loadAppConfig({
					configFile: './app.jsonc',
					stage: 'prod',
				}),
				join(root, 'app.prod.jsonc')
			)
		})
	})

	it('reports final schema validation errors against the stage file', async () => {
		await withWorkspace(async root => {
			await writeFile(
				join(root, 'app.prod.jsonc'),
				JSON.stringify({
					operations: [{ op: 'replace', path: '/region', value: 'invalid-region' }],
				})
			)

			await expectStageFileError(
				loadAppConfig({
					configFile: './app.jsonc',
					stage: 'prod',
				}),
				join(root, 'app.prod.jsonc')
			)
		})
	})
})

describe('stage patch schema generation', () => {
	it('creates path-aware entries from the app schema', () => {
		const appSchema = zodToJsonSchema(AppSchema, {
			name: 'app',
			pipeStrategy: 'input',
			$refStrategy: 'none',
		})
		const stageSchema = createStagePatchJsonSchema(appSchema, 'Awsless App Stage Patch Config')
		const operations = getOperationSchemas(stageSchema)
		const replaceOperation = findOperationSchema(operations, 'replace')

		expect(stageSchema.title).toBe('Awsless App Stage Patch Config')
		expect(replaceOperation?.properties?.path).toEqual(
			expect.objectContaining({
				oneOf: expect.arrayContaining([expect.objectContaining({ const: '/profile' })]),
			})
		)
		expect(findConditionalValueSchema(replaceOperation, '/profile')).toEqual(
			expect.objectContaining({
				type: 'string',
			})
		)
	})
})

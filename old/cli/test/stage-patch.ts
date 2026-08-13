import JSON5 from 'json5'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
		})
	)
	await writeFile(
		join(root, 'api', 'stack.jsonc'),
		JSON.stringify({
			name: 'api',
			depends: ['core'],
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
	it('loads the base app config unchanged when no stage patch exists', async () => {
		await withWorkspace(async () => {
			const app = await loadAppConfig({
				configFile: './app.jsonc',
			})

			expect(app.name).toBe('demo')
			expect(app.profile).toBe('default')
			expect(app.protect).toBe(false)
		})
	})

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

	it('applies full RFC 6902 stack stage patches', async () => {
		await withWorkspace(async root => {
			await writeFile(
				join(root, 'api', 'stack.prod.jsonc'),
				JSON.stringify({
					$schema: '../../dist/stack.stage.json',
					operations: [
						{ op: 'copy', from: '/name', path: '/depends/1' },
						{ op: 'move', from: '/depends/1', path: '/depends/0' },
						{ op: 'replace', path: '/name', value: 'jobs' },
						{ op: 'remove', path: '/depends/1' },
						{ op: 'test', path: '/depends/0', value: 'api' },
						{ op: 'add', path: '/depends/1', value: 'worker' },
					],
				})
			)

			await loadAppConfig({
				configFile: './app.jsonc',
				stage: 'prod',
			})

			const stacks = await loadStackConfigs({
				configFile: './app.jsonc',
				stage: 'prod',
			})

			expect(stacks).toHaveLength(1)
			expect(stacks[0]?.name).toBe('jobs')
			expect(stacks[0]?.depends).toEqual(['api', 'worker'])
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
	it('builds path-aware schemas for exact, dynamic, and array paths', () => {
		const schema = createStagePatchJsonSchema(
			{
				type: 'object',
				properties: {
					mode: {
						type: 'string',
						enum: ['dev', 'prod'],
					},
					flags: {
						type: 'object',
						additionalProperties: {
							type: 'boolean',
						},
					},
					tags: {
						type: 'array',
						items: {
							type: 'string',
						},
					},
				},
			},
			'Stage Patch Test'
		)

		const operations = getOperationSchemas(schema)
		const addOperation = findOperationSchema(operations, 'add')
		const replaceOperation = findOperationSchema(operations, 'replace')

		expect(replaceOperation?.properties?.path).toEqual(
			expect.objectContaining({
				oneOf: expect.arrayContaining([expect.objectContaining({ const: '/mode' })]),
			})
		)
		expect(findConditionalValueSchema(replaceOperation, '/mode')).toEqual(
			expect.objectContaining({ enum: ['dev', 'prod'] })
		)
		expect(findConditionalValueSchema(replaceOperation, '^/flags/[^/]+$')).toEqual(
			expect.objectContaining({ type: 'boolean' })
		)
		expect(findConditionalValueSchema(addOperation, '/tags/-')).toEqual(expect.objectContaining({ type: 'string' }))
	})

	it('creates concrete app stage patch entries from the app schema', () => {
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

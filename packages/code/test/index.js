
import { build, bundle, compile, exec, importModule, RuntimeError } from '../src'
import { clean } from '../src/clean'
import { join } from 'path'
import { readFile } from 'fs/promises'

describe('Code', () => {

	const testPath = (dir, file = 'index.js') => {
		return join(process.cwd(), 'test/data', dir, file)
	}

	it('should support every file type', async () => {
		const path = testPath('every-file-type')
		const result = await bundle(path)
		const types = ['JS', 'JSX', 'COFFEE', 'JSON', 'HTML', 'MD', 'LUA', 'hash']

		types.forEach((type) => {
			expect(result.code.includes(`${type} =`)).toBe(true)
		})
	})

	it('should remove un-used code (treeshaking)', async () => {
		const path = testPath('treeshaking')
		const result = await bundle(path, { sourceMap: false })
		expect(result.code).toBe("'use strict';\n\n")
	})

	it('should remove un-used package export code (treeshaking)', async () => {
		const path = testPath('treeshaking-package')

		const result1 = await bundle(path, {
			sourceMap: false,
			transpilers: { typescript: false }
		})

		expect(result1.code.length).toBeGreaterThan(6000)
		expect(result1.code.length).toBeLessThan(7000)

		const result2 = await bundle(path, {
			sourceMap: false,
			transpilers: { typescript: true }
		})

		// USING TYPESCRIPT SHOULD NOT BREAK TREESHAKING...

		// expect(result2).toBeGreaterThan(6000)
		// expect(result2).toBeLessThan(7000)

		console.log(result1.code.length, result2.code.length)
	})

	it('should exec', async () => {
		const path = testPath('console-log')
		const result = await exec(path)
		expect(result).toBe('Hello World')
	})

	it('should compile a single file', async () => {
		const path = testPath('compile-single-file')
		const result = await compile(path, { sourceMap: false })
		expect(result.code).toBe(`'use strict';\n\nvar other = require('./other');\n\nother.log('First');\n`)
	})

	it('should build for package', async () => {
		const in1 = testPath('build-for-package', 'input-1.js')
		const in2 = testPath('build-for-package', 'input-2.js')

		await build([ in1, in2 ], 'test/dist')

		const c1 = await readFile(join(process.cwd(), 'test/dist/input-1.cjs'))
		expect(c1.toString()).toContain(`require('uuid')`)

		const e1 = await readFile(join(process.cwd(), 'test/dist/input-1.js'))
		expect(e1.toString()).toContain(`from 'uuid'`)

		const c2 = await readFile(join(process.cwd(), 'test/dist/input-2.cjs'))
		expect(c2.toString()).toContain(`console.log('Hello')`)

		const e2 = await readFile(join(process.cwd(), 'test/dist/input-2.js'))
		expect(e2.toString()).toContain(`console.log('Hello')`)

		await clean('test/dist')
	}, 10000)

	it('should bundle all files', async () => {
		const path = testPath('bundle')
		const result = await bundle(path, { sourceMap: false })

		expect(result.code.length).toBeGreaterThan(100)
		expect(result.code).not.toContain('import')
		expect(result.code).not.toContain('require')
	})

	it('should fail for syntax errors', async () => {
		const path = testPath('syntax-error')
		await expect(exec(path))
			.rejects.toThrow(Error)
	})

	it('should fail for runtime errors', async () => {
		const path = testPath('runtime-error')

		await expect(exec(path))
			.rejects.toThrow(RuntimeError)

		await expect(exec(path))
			.rejects.toThrow('Random Error')
	})

	it('should minimize code', async () => {
		const path = testPath('minimize')

		const result1 = await compile(path, { minimize: false, sourceMap: false })
		expect(result1.code).toBe(`'use strict';\n\nconst long_variable_name = 1;\nconsole.log(long_variable_name);\n`)

		const result2 = await compile(path, { minimize: true, sourceMap: false })
		expect(result2.code).toBe(`"use strict";console.log(1);\n`)
	})

	it('should format export/import code correcly', async () => {
		const path = testPath('format')

		const result1 = await compile(path, { sourceMap: false, format:'cjs' })
		expect(result1.code).toBe(`'use strict';\n\nvar index = ((event, context, callback) => {\n  callback(null, event);\n});\n\nmodule.exports = index;\n`)

		const result2 = await compile(path, { sourceMap: false, format: 'esm' })
		expect(result2.code).toBe(`var index = ((event, context, callback) => {\n  callback(null, event);\n});\n\nexport { index as default };\n`)
	})

	it('should generate a source map', async () => {
		const path = testPath('bundle')
		const result = await bundle(path, { sourceMap: true })
		expect(result.map.toString()).toBeDefined()
	})

	it('should support top level await', async () => {
		const path = testPath('top-level-await')
		const result = await bundle(path, { minimize: true, format: 'esm', sourceMap: true })
		expect(result.code).toBeDefined()
	})

	it('should ignore bundling externals', async () => {
		const path = testPath('external')
		const result = await bundle(path, {
			sourceMap: false,
			external: (importee) => {
				return importee === './file1.js'
			}
		})

		expect(result.code).toContain("require('./file1.js');")
		expect(result.code).not.toContain("console.log('1');")
		expect(result.code).toContain("console.log('2');")
	})

	it('should export named default', async () => {
		const path = testPath('export-default')
		const result = await bundle(path, {
			sourceMap: false,
			exports: 'named',
		})

		expect(result.code).toContain('exports.default = ')
	})

	it('should import module', async () => {
		const path = testPath('import-module')
		const result = await importModule(path)

		expect(result).toBeDefined()
		expect(result(1, 2)).toBe(3)
	})

	it('should default jsx to preact', async () => {
		const path = testPath('jsx')
		const result = await bundle(path, {
			sourceMap: false
		})

		expect(result.code).toBeDefined()
		expect(result.code.includes('("div"')).toBe(true)
	})

	it('should default tsx to preact', async () => {
		const path = testPath('tsx')
		const result = await bundle(path, {
			sourceMap: false
		})

		expect(result.code).toBeDefined()
		expect(result.code.includes('("div"')).toBe(true)
	})

	it('should support stylus', async () => {
		const path = testPath('stylus')
		const result = await bundle(path, {
			sourceMap: false
		})

		expect(result.code).toBeDefined()
		expect(result.code.includes('html{margin:0;padding:0;background:#000}')).toBe(true)
	})

	describe('File Types', () => {
		const types = {
			js: testPath('types', '1.js'),
			jsx: testPath('types', '2.jsx'),
			ts: testPath('types', '3.ts'),
			coffee: testPath('types', '4.coffee'),
			all: testPath('types')
		}

		describe('bundle', () => {
			Object.entries(types).forEach(([ type, path ]) => {
				it(type, async () => {
					const result = await bundle(path, { sourceMap: false })
					expect(result.map).toBeUndefined()
					expect(result.code).toBeDefined()
				})
			})
		})

		describe('compile', () => {
			Object.entries(types).forEach(([ type, path ]) => {
				it(type, async () => {
					const result = await compile(path, { sourceMap: false })
					expect(result.map).toBeUndefined()
					expect(result.code).toBeDefined()
				})
			})
		})

	})
})

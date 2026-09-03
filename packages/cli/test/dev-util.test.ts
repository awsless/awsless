import { describe, expect, it } from 'vitest'
import { decodeAwsChunked, isConfigFile, isIgnoredPath } from '../src/dev/util'
import { createFrameReader, WorkerRecord } from '../src/dev/worker'

describe('decodeAwsChunked', () => {
	const chunk = (data: string) => {
		const bytes = Buffer.from(data, 'utf8')

		return `${bytes.length.toString(16)};chunk-signature=abc\r\n${data}\r\n`
	}

	it('should concatenate the data of every chunk', () => {
		const body = Buffer.from(chunk('hello ') + chunk('wörld') + '0;chunk-signature=def\r\n\r\n')

		expect(decodeAwsChunked(body).toString()).toBe('hello wörld')
	})

	it('should stop at the final chunk & ignore trailers', () => {
		const body = Buffer.from(chunk('data') + '0;chunk-signature=def\r\nx-amz-checksum-crc32:abcd\r\n\r\n')

		expect(decodeAwsChunked(body).toString()).toBe('data')
	})

	it('should keep binary chunk data intact', () => {
		const bytes = Buffer.from([0, 255, 13, 10, 1])
		const body = Buffer.concat([
			Buffer.from(`${bytes.length.toString(16)};chunk-signature=abc\r\n`),
			bytes,
			Buffer.from('\r\n0;chunk-signature=def\r\n\r\n'),
		])

		expect(decodeAwsChunked(body)).toEqual(bytes)
	})
})

describe('source watcher rules', () => {
	it('should recognize every config file name the loader accepts', () => {
		for (const path of ['app.json', 'app.jsonc', 'app.json5', 'stack.jsonc', 'api/stack.json', 'api/web.stack.json5']) {
			expect(isConfigFile(path), path).toBe(true)
		}

		for (const path of ['src/stack.ts', 'stacks.jsonc', 'app.ts', 'my-app.jsonc', 'app.prod.jsonc', 'package.json']) {
			expect(isConfigFile(path), path).toBe(false)
		}
	})

	it('should skip the build & dependency folders', () => {
		expect(isIgnoredPath('node_modules/pkg/index.js')).toBe(true)
		expect(isIgnoredPath('.awsless/build/x.js')).toBe(true)
		expect(isIgnoredPath('web/dist/app.js')).toBe(true)
		expect(isIgnoredPath('.git/HEAD')).toBe(true)
		expect(isIgnoredPath('src/handler.ts')).toBe(false)
		expect(isIgnoredPath('distribution/x.ts')).toBe(false)
	})
})

describe('worker output frames', () => {
	const read = (chunks: string[]) => {
		const records: WorkerRecord[] = []
		const reader = createFrameReader(record => records.push(record))

		for (const chunk of chunks) {
			reader(chunk)
		}

		return records
	}

	const frame = (route: string, text: string) => `\x1f${route}\x1f${JSON.stringify(text)}\n`

	it('should decode framed records with their route', () => {
		expect(read([frame('stack:route', 'hello\nworld')])).toEqual([{ route: 'stack:route', text: 'hello\nworld' }])
	})

	it('should leave the route empty for output outside a dispatch', () => {
		expect(read([frame('', 'boot')])).toEqual([{ route: undefined, text: 'boot' }])
	})

	it('should reassemble a record split across chunks', () => {
		const line = frame('stack:route', 'one two three')
		const cut = Math.floor(line.length / 2)

		expect(read([line.slice(0, 3), line.slice(3, cut), line.slice(cut)])).toEqual([
			{ route: 'stack:route', text: 'one two three' },
		])
	})

	it('should hold a partial line until its newline arrives', () => {
		const records: WorkerRecord[] = []
		const reader = createFrameReader(record => records.push(record))

		reader('plain output without newline')
		expect(records).toEqual([])

		reader('\n')
		expect(records).toEqual([{ text: 'plain output without newline' }])
	})

	it('should pass unframed & malformed lines through as text', () => {
		expect(read(['node crash trace\n\n\x1froute\x1fnot json\n'])).toEqual([
			{ text: 'node crash trace' },
			{ route: 'route', text: 'not json' },
		])
	})

	it('should split multiple records in one chunk', () => {
		expect(read([frame('a', '1') + frame('b', '2') + 'tail\n'])).toEqual([
			{ route: 'a', text: '1' },
			{ route: 'b', text: '2' },
			{ text: 'tail' },
		])
	})
})

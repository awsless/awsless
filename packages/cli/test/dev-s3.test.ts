import { mkdtemp, readdir, readFile, rm } from 'fs/promises'
import { request } from 'http'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createS3Server } from '../src/dev/servers/s3'

// A raw request instead of fetch, so an encoded traversal reaches the
// server exactly as sent instead of being normalized away by the url
// parser first.
const raw = (port: number, method: string, path: string, body?: string, headers: Record<string, string> = {}) => {
	return new Promise<{ status: number; body: string; headers: Record<string, unknown> }>((resolve, reject) => {
		const req = request({ host: '127.0.0.1', port, method, path, headers }, res => {
			const chunks: Buffer[] = []

			res.on('data', chunk => chunks.push(chunk))
			res.on('end', () =>
				resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString(), headers: res.headers })
			)
		})

		req.on('error', reject)
		req.end(body)
	})
}

describe('dev s3 emulator', () => {
	const cleanup: (() => Promise<void>)[] = []

	const boot = async (rules: { id: string; events: string[]; prefix: string }[] = []) => {
		const root = await mkdtemp(join(tmpdir(), 'awsless-s3-'))
		const server = createS3Server({ root, region: 'us-east-1', rules })
		const port = await server.listen()

		cleanup.push(async () => {
			await server.stop()
			await rm(root, { recursive: true, force: true })
		})

		return { root, server, port }
	}

	afterEach(async () => {
		await Promise.all(cleanup.splice(0).map(fn => fn()))
	})

	it('should store, list, read & delete objects inside the bucket folder', async () => {
		const { root, port } = await boot()

		const put = await raw(port, 'PUT', '/bucket/dir/file.txt', 'hello')

		expect(put.status).toBe(200)
		expect(put.headers.etag).toMatch(/^"[0-9a-f]{32}"$/)
		await expect(readdir(join(root, 'bucket', 'dir'))).resolves.toEqual(['file.txt'])

		await expect(raw(port, 'GET', '/bucket/dir/file.txt')).resolves.toMatchObject({ status: 200, body: 'hello' })
		await expect(raw(port, 'HEAD', '/bucket/dir/file.txt')).resolves.toMatchObject({ status: 200, body: '' })

		const list = await raw(port, 'GET', '/bucket?prefix=dir/')

		expect(list.status).toBe(200)
		expect(list.body).toContain('<Key>dir/file.txt</Key>')

		await expect(raw(port, 'DELETE', '/bucket/dir/file.txt')).resolves.toMatchObject({ status: 204 })
		await expect(raw(port, 'GET', '/bucket/dir/file.txt')).resolves.toMatchObject({ status: 404 })
	})

	it('should reject keys & buckets that escape the store folder', async () => {
		const { root, port } = await boot()

		const traversals = [
			'/bucket/%2e%2e%2f%2e%2e%2fescape.txt',
			'/bucket/..%2Fescape.txt',
			'/%2e%2e%2foutside/file.txt',
			'/..%2Foutside/file.txt',
		]

		for (const path of traversals) {
			const res = await raw(port, 'PUT', path, 'x')

			expect(res.status, path).toBe(400)
			expect(res.body, path).toContain('Invalid bucket or object key')
		}

		// Nothing landed outside the store root.
		await expect(readdir(join(root, '..'))).resolves.not.toContain('escape.txt')
		await expect(readdir(root)).resolves.toEqual([])
	})

	it('should list the whole bucket without a prefix & answer HEAD misses without a body', async () => {
		const { port } = await boot()

		await raw(port, 'PUT', '/bucket/a.txt', '1')
		await raw(port, 'PUT', '/bucket/dir/b.txt', '22')

		const list = await raw(port, 'GET', '/bucket')

		expect(list.body).toContain('<KeyCount>2</KeyCount>')
		expect(list.body).toContain('<Key>a.txt</Key>')
		expect(list.body).toContain('<Key>dir/b.txt</Key>')

		await expect(raw(port, 'HEAD', '/bucket/missing.txt')).resolves.toMatchObject({ status: 404, body: '' })
	})

	it('should decode an aws-chunked upload', async () => {
		const { port } = await boot()
		const chunked = `5;chunk-signature=abc\r\nhello\r\n0;chunk-signature=def\r\n\r\n`

		await raw(port, 'PUT', '/bucket/chunked.txt', chunked, { 'content-encoding': 'aws-chunked' })

		await expect(raw(port, 'GET', '/bucket/chunked.txt')).resolves.toMatchObject({ status: 200, body: 'hello' })
	})

	it('should accept a key that merely starts with two dots', async () => {
		const { root, port } = await boot()

		await expect(raw(port, 'PUT', '/bucket/..hidden', 'x')).resolves.toMatchObject({ status: 200 })
		await expect(readFile(join(root, 'bucket', '..hidden'), 'utf8')).resolves.toBe('x')
	})

	it('should copy the source object on a copy request instead of storing an empty one', async () => {
		const { server, port } = await boot([{ id: 'stack:on-copy', events: ['s3:ObjectCreated:Copy'], prefix: '' }])
		const dispatch = vi.fn(async (_event: unknown) => {})

		server.connect(dispatch)

		await raw(port, 'PUT', '/bucket/src/a%20b.txt', 'payload')

		const copy = await raw(port, 'PUT', '/bucket/dst/c.txt', undefined, {
			'x-amz-copy-source': '/bucket/src/a%20b.txt',
		})

		expect(copy.status).toBe(200)
		expect(copy.body).toContain('<CopyObjectResult>')
		await expect(raw(port, 'GET', '/bucket/dst/c.txt')).resolves.toMatchObject({ status: 200, body: 'payload' })

		await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1))
		expect(dispatch.mock.calls[0]![0]).toMatchObject({
			Records: [{ eventName: 'ObjectCreated:Copy', s3: { object: { key: 'dst/c.txt', size: 7 } } }],
		})

		await expect(
			raw(port, 'PUT', '/bucket/dst/d.txt', undefined, { 'x-amz-copy-source': '/bucket/missing.txt' })
		).resolves.toMatchObject({ status: 404 })
		await expect(
			raw(port, 'PUT', '/bucket/dst/e.txt', undefined, { 'x-amz-copy-source': '/..%2Foutside/file.txt' })
		).resolves.toMatchObject({ status: 400 })
	})

	it('should dispatch bucket notifications for matching rules', async () => {
		const { server, port } = await boot([
			{ id: 'stack:on-upload', events: ['s3:ObjectCreated:*'], prefix: 'uploads/' },
		])
		const dispatch = vi.fn(async (_event: unknown) => {})

		server.connect(dispatch)

		await raw(port, 'PUT', '/bucket/other/file.txt', 'x')
		await raw(port, 'PUT', '/bucket/uploads/a%20b.txt', 'hello')

		await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1))

		expect(dispatch.mock.calls[0]![0]).toMatchObject({
			Records: [
				{
					eventName: 'ObjectCreated:Put',
					s3: {
						configurationId: 'stack:on-upload',
						bucket: { name: 'bucket' },
						object: { key: 'uploads/a+b.txt', size: 5 },
					},
				},
			],
		})
	})
})

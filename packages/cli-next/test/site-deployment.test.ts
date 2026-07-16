import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createS3Provider } from '../src/formation/s3'
import { credentials, sent } from './_kit'

const source = join(process.cwd(), '.awsless', 'temp', 'site-deployment-test')

const mockS3 = () => {
	return vi.spyOn(S3Client.prototype, 'send').mockImplementation(async command => {
		if (command instanceof PutObjectCommand) {
			return {}
		}

		throw new Error('Unexpected command')
	})
}

describe('S3 site deployment', () => {
	beforeEach(async () => {
		await mkdir(source, { recursive: true })
		await writeFile(join(source, 'index.html'), '<h1>Hello</h1>')
		await writeFile(join(source, 'app.js'), 'console.log("hello")')
	})

	afterEach(async () => {
		vi.restoreAllMocks()
		await rm(source, { recursive: true, force: true })
	})

	it('should upload new site versions without deleting the previous version', async () => {
		const send = mockS3()
		const provider = createS3Provider({ credentials, region: 'us-east-1' })
		const created = await provider.createResource({
			type: 'site-deployment',
			state: {
				bucket: 'site-bucket',
				source,
				version: 'new-version',
			},
		})

		const uploads = sent(send, PutObjectCommand).map(command => command.input)

		expect(uploads.map(upload => upload.Key).sort()).toEqual(['v-new-version/app.js', 'v-new-version/index.html'])
		expect(uploads).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					Key: 'v-new-version/index.html',
					ContentType: 'text/html; charset=utf-8',
					CacheControl: 's-maxage=31536000, max-age=0',
				}),
				expect.objectContaining({
					Key: 'v-new-version/app.js',
					ContentType: 'application/javascript; charset=utf-8',
					CacheControl: 'public, max-age=31536000, immutable',
				}),
			])
		)
		expect(created.state).toEqual({ bucket: 'site-bucket', source, version: 'new-version' })

		send.mockClear()
		const updated = await provider.updateResource({
			type: 'site-deployment',
			priorState: created.state,
			proposedState: { bucket: 'site-bucket', source, version: 'next-version' },
		})

		expect(
			sent(send, PutObjectCommand)
				.map(command => command.input.Key)
				.sort()
		).toEqual(['v-next-version/app.js', 'v-next-version/index.html'])
		expect(updated.state.version).toBe('next-version')
	})

	it('should preserve the current version when it is unchanged', async () => {
		const send = mockS3()
		const provider = createS3Provider({ credentials, region: 'us-east-1' })
		const result = await provider.updateResource({
			type: 'site-deployment',
			priorState: {
				bucket: 'site-bucket',
				source,
				version: 'current-version',
			},
			proposedState: {
				bucket: 'site-bucket',
				source,
				version: 'current-version',
			},
		})

		expect(send).not.toHaveBeenCalled()
		expect(result.state).toEqual({ bucket: 'site-bucket', source, version: 'current-version' })
	})
})

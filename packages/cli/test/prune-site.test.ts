import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { subHours } from 'date-fns'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pruneSiteVersions } from '../src/util/deployment'
import { notFound, sent } from './_kit'

type Object = { Key: string; LastModified: Date }

const old = subHours(new Date(), 25)
const fresh = new Date()

const route = (to: string) => JSON.stringify([{ rewrite: { regex: '^/(.*)', to } }])

const mockS3 = (pages: Object[][], missing = false) => {
	return vi.spyOn(S3Client.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof ListObjectsV2Command) {
			if (missing) {
				throw notFound('NoSuchBucket')
			}

			const index = command.input.ContinuationToken ? Number(command.input.ContinuationToken) : 0
			const next = index + 1 < pages.length ? String(index + 1) : undefined

			return { Contents: pages[index], NextContinuationToken: next }
		}

		if (command instanceof DeleteObjectsCommand) {
			return {}
		}

		throw new Error(`Unexpected S3 command: ${command.constructor.name}`)
	})
}

const deletedKeys = (send: ReturnType<typeof mockS3>) => {
	return sent(send, DeleteObjectsCommand).flatMap(command => command.input.Delete?.Objects?.map(o => o.Key) ?? [])
}

describe('site version pruning', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should keep the versions a surviving route table rewrites to', async () => {
		const send = mockS3([
			[
				{ Key: 'site/web/main-1/v-aaa/index.html', LastModified: old },
				{ Key: 'site/web/main-1/v-aaa/app.js', LastModified: old },
				{ Key: 'site/web/main-2/v-bbb/index.html', LastModified: old },
			],
		])

		await pruneSiteVersions({
			s3: new S3Client({}),
			bucket: 'assets',
			survivingRoutes: [route('/site/web/main-2/v-bbb/index.html')],
		})

		expect(deletedKeys(send)).toEqual(['site/web/main-1/v-aaa/index.html', 'site/web/main-1/v-aaa/app.js'])
	})

	it('should keep unreferenced versions younger than a day', async () => {
		const send = mockS3([
			[
				{ Key: 'site/web/main-1/v-aaa/index.html', LastModified: old },
				{ Key: 'site/web/main-1/v-aaa/app.js', LastModified: fresh },
				{ Key: 'site/web/main-2/v-bbb/index.html', LastModified: old },
			],
		])

		await pruneSiteVersions({ s3: new S3Client({}), bucket: 'assets', survivingRoutes: [] })

		// One fresh file keeps its whole version prefix.
		expect(deletedKeys(send)).toEqual(['site/web/main-2/v-bbb/index.html'])
	})

	it('should ignore routes without a site rewrite & unparsable route tables', async () => {
		const send = mockS3([[{ Key: 'site/web/main-1/v-aaa/index.html', LastModified: old }]])

		await pruneSiteVersions({
			s3: new S3Client({}),
			bucket: 'assets',
			survivingRoutes: [
				'not json',
				JSON.stringify({ type: 'lambda' }),
				route('/api/main-1/v-aaa/'),
				JSON.stringify([{ rewrite: { to: 42 } }]),
			],
		})

		expect(deletedKeys(send)).toEqual(['site/web/main-1/v-aaa/index.html'])
	})

	it('should skip keys outside the versioned layout & sweep every page', async () => {
		const send = mockS3([
			[
				{ Key: 'site/web/index.html', LastModified: old },
				{ Key: 'site/web/main-1/v-aaa/index.html', LastModified: old },
			],
			[{ Key: 'site/web/main-2/v-bbb/index.html', LastModified: old }],
		])

		await pruneSiteVersions({ s3: new S3Client({}), bucket: 'assets', survivingRoutes: [] })

		expect(sent(send, ListObjectsV2Command)).toHaveLength(2)
		expect(deletedKeys(send)).toEqual(['site/web/main-1/v-aaa/index.html', 'site/web/main-2/v-bbb/index.html'])
	})

	it('should do nothing for apps without the assets bucket', async () => {
		const send = mockS3([], true)

		await expect(
			pruneSiteVersions({ s3: new S3Client({}), bucket: 'assets', survivingRoutes: [] })
		).resolves.toBeUndefined()

		expect(sent(send, DeleteObjectsCommand)).toHaveLength(0)
	})
})

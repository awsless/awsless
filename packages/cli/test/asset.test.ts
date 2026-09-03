import { describe, expect, it } from 'vitest'
import { createTestApp, findStatements, listResources } from './_kit'

describe('asset', () => {
	it('creates the shared versioned bucket & grants the app access to it', () => {
		const { app, appId, shared } = createTestApp()

		const bucket = listResources(app, 'aws_s3_bucket').find(
			meta => meta.input.bucket === `test-app--store--assets--${appId}`
		)!

		expect(bucket).toBeDefined()
		expect(bucket.input.versioning).toEqual({ enabled: true })
		expect(listResources(app, 'aws_s3_bucket_policy')).toHaveLength(1)

		const [statement] = findStatements(shared, 's3:PutObject')

		expect(statement).toBeDefined()
		expect(statement!.conditions).toMatchObject({ StringEquals: { 's3:ResourceAccount': '123456789012' } })
		expect(shared.get('asset', 'bucket').name).toBeDefined()
	})
})

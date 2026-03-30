import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { fromUnixTime, isFuture, isPast } from 'date-fns'
import { readFileSync } from 'fs'
import { glob } from 'glob'
import { contentType, lookup } from 'mime-types'
import { extname, join } from 'path'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials } from '../util/aws'

type SiteDeploymentInput = {
	bucket: Input<string>
	source: Input<string>
	version: Input<string>
	ttl: Input<number>
}

type SiteDeploymentOutput = {
	bucket: Output<string>
	source: Output<string>
	version: Output<string>
	ttl: Output<number>
	oldVersions: Output<{ version: string; ttl: number }[]>
}

export const SiteDeployment = createCustomResourceClass<SiteDeploymentInput, SiteDeploymentOutput>(
	's3',
	'site-deployment'
)

type ProviderProps = {
	credentials: Credentials
	region: Region
}

const oldVersionSchema = z.object({
	version: z.string(),
	ttl: z.number(),
})

const stateSchema = z.object({
	bucket: z.string(),
	source: z.string(),
	version: z.string(),
	ttl: z.number(),
	oldVersions: z.array(oldVersionSchema).optional().default([]),
})

const getCacheControl = (file: string) => {
	switch (lookup(file)) {
		case false:
		case 'text/html':
		case 'application/json':
		case 'application/manifest+json':
		case 'application/manifest':
		case 'text/markdown':
			return 's-maxage=31536000, max-age=0'

		default:
			return `public, max-age=31536000, immutable`
	}
}

const uploadFiles = async (client: S3Client, bucket: string, source: string, version: string) => {
	const files = glob.sync('**', { cwd: source, nodir: true })

	await Promise.all(
		files.map(file => {
			const key = join(`v-${version}`, file)
			// return s3.write(key, Bun.file(join(source, file)))
			return client.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: readFileSync(join(source, file)),
					ContentType: contentType(extname(file)) || 'text/html; charset=utf-8',
					CacheControl: getCacheControl(file),
				})
			)
		})
	)
}

const deleteVersion = async (s3: Bun.S3Client, version: string) => {
	let startAfter: string | undefined
	let hasMore = true

	while (hasMore) {
		const res = await s3.list({ prefix: `v-${version}/`, startAfter })
		const contents = res.contents ?? []
		await Promise.all(contents.map(obj => s3.delete(obj.key)))
		startAfter = contents[contents.length - 1]?.key
		hasMore = res.isTruncated ?? false
	}
}

const createBunClient = async (credentials: Credentials, region: Region, bucket: string) => {
	const creds = await credentials()
	return new Bun.S3Client({
		accessKeyId: creds.accessKeyId,
		secretAccessKey: creds.secretAccessKey,
		sessionToken: creds.sessionToken,
		region,
		bucket,
	})
}

export const createS3Provider = ({ credentials, region }: ProviderProps) => {
	const awsClient = new S3Client({ credentials, region })

	return createCustomProvider('s3', {
		'site-deployment': {
			async createResource(props) {
				const state = stateSchema.parse(props.state)
				await uploadFiles(awsClient, state.bucket, state.source, state.version)
				return { ...state, oldVersions: [] }
			},
			async updateResource(props) {
				if (props.priorState.bucket !== props.proposedState.bucket) {
					throw new Error(`bucket can't be changed.`)
				}

				const prior = stateSchema.parse(props.priorState)
				const proposed = stateSchema.parse(props.proposedState)

				// Upload new version
				await uploadFiles(awsClient, proposed.bucket, proposed.source, proposed.version)

				// Retire prior version an expired TTL
				const oldVersions = [...prior.oldVersions, { version: prior.version, ttl: proposed.ttl }]
				const active = oldVersions.filter(r => isFuture(fromUnixTime(r.ttl)))
				const expired = oldVersions.filter(r => isPast(fromUnixTime(r.ttl)))

				// Delete expired versions from S3
				const s3 = await createBunClient(credentials, region, proposed.bucket)
				await Promise.all(expired.map(r => deleteVersion(s3, r.version)))

				return { ...proposed, oldVersions: active }
			},
			async deleteResource(props) {
				const state = stateSchema.parse(props.state)
				const s3 = await createBunClient(credentials, region, state.bucket)

				// Delete current + all old versions
				await deleteVersion(s3, state.version)
				await Promise.all(state.oldVersions.map(r => deleteVersion(s3, r.version)))
			},
		},
	})
}

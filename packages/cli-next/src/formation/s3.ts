import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { contentType, lookup } from 'mime-types'
import promiseLimit from 'p-limit'
import { extname, join, posix } from 'path'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials } from '../util/aws'

type SiteDeploymentInput = {
	bucket: Input<string>
	source: Input<string>
	version: Input<string>
}

type SiteDeploymentOutput = {
	bucket: Output<string>
	source: Output<string>
	version: Output<string>
}

export const SiteDeployment = createCustomResourceClass<SiteDeploymentInput, SiteDeploymentOutput>(
	's3',
	'site-deployment'
)

type ProviderProps = {
	credentials: Credentials
	region: Region
}

export const createS3Provider = ({ credentials, region }: ProviderProps) => {
	const client = new S3Client({ credentials, region })
	const inputSchema = z.object({
		bucket: z.string(),
		source: z.string(),
		version: z.string(),
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
				return 'public, max-age=31536000, immutable'
		}
	}

	const uploadFiles = async (bucket: string, source: string, version: string) => {
		const files = glob.sync('**', { cwd: source, nodir: true })
		const limit = promiseLimit(16)

		await Promise.all(
			files.map(file =>
				limit(async () => {
					await client.send(
						new PutObjectCommand({
							Bucket: bucket,
							Key: posix.join(`v-${version}`, file),
							Body: await readFile(join(source, file)),
							ContentType: contentType(extname(file)) || 'text/html; charset=utf-8',
							CacheControl: getCacheControl(file),
						})
					)
				})
			)
		)
	}

	return createCustomProvider('s3', {
		'site-deployment': {
			async createResource(props) {
				const state = inputSchema.parse(props.state)

				await uploadFiles(state.bucket, state.source, state.version)

				return state
			},
			async updateResource(props) {
				const prior = inputSchema.parse(props.priorState)
				const proposed = inputSchema.parse(props.proposedState)

				if (prior.bucket !== proposed.bucket) {
					throw new Error(`bucket can't be changed.`)
				}

				if (prior.version !== proposed.version) {
					await uploadFiles(proposed.bucket, proposed.source, proposed.version)
				}

				return proposed
			},

			// Uploaded versions are never deleted so older deployments stay rollbackable.
		},
	})
}

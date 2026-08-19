import { readFile } from 'fs/promises'
import { join, posix } from 'path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { glob } from 'glob'
import promiseLimit from 'p-limit'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials } from '../util/aws'
import { getCacheControl, getContentType } from '../util/content.js'

type SiteDeploymentInput = {
	bucket: Input<string>
	prefix: Input<string>
	source: Input<string>
	version: Input<string>
}

type SiteDeploymentOutput = {
	bucket: Output<string>
	prefix: Output<string>
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
		prefix: z.string().default(''),
		source: z.string(),
		version: z.string(),
	})

	const uploadFiles = async (state: z.output<typeof inputSchema>) => {
		const files = glob.sync('**', { cwd: state.source, nodir: true })
		const limit = promiseLimit(16)

		await Promise.all(
			files.map(file =>
				limit(async () => {
					await client.send(
						new PutObjectCommand({
							Bucket: state.bucket,
							Key: posix.join(state.prefix, `v-${state.version}`, file),
							Body: await readFile(join(state.source, file)),
							ContentType: getContentType(file),
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

				await uploadFiles(state)

				return state
			},
			async updateResource(props) {
				const prior = inputSchema.parse(props.priorState)
				const proposed = inputSchema.parse(props.proposedState)

				if (
					prior.bucket !== proposed.bucket ||
					prior.prefix !== proposed.prefix ||
					prior.version !== proposed.version
				) {
					await uploadFiles(proposed)
				}

				return proposed
			},

			// Uploaded versions are never deleted so older deployments stay rollbackable.
		},
	})
}

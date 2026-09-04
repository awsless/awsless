import { readFile } from 'fs/promises'
import { join, posix } from 'path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { glob } from 'glob'
import promiseLimit from 'p-limit'
import { z } from 'zod'
import { formatSourcemapPrefix, formatSourcemapVersionKey } from '../feature/on-error-log/keys.js'
import { ProviderProps } from '../util/aws.js'
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

type SourcemapDeploymentInput = {
	bucket: Input<string>
	name: Input<string>
	hash: Input<string>
	source: Input<string>
	version: Input<string>
}

type SourcemapDeploymentOutput = {
	bucket: Output<string>
	name: Output<string>
	hash: Output<string>
	source: Output<string>
	version: Output<string>
}

// Uploads a lambda build's sourcemaps plus a version index object, so
// the error-log handler can find the erroring version's maps.
export const SourcemapDeployment = createCustomResourceClass<SourcemapDeploymentInput, SourcemapDeploymentOutput>(
	's3',
	'sourcemap-deployment'
)

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

	const sourcemapSchema = z.object({
		bucket: z.string(),
		name: z.string(),
		hash: z.string(),
		source: z.string(),
		version: z.string(),
	})

	// The version index: reading it is the only lookup the error-log
	// handler needs to find the maps of the version that errored.
	const uploadSourcemapIndex = async (state: z.output<typeof sourcemapSchema>) => {
		await client.send(
			new PutObjectCommand({
				Bucket: state.bucket,
				Key: formatSourcemapVersionKey(state.name, state.version),
				Body: formatSourcemapPrefix(state.name, state.hash),
				ContentType: 'text/plain',
			})
		)
	}

	const uploadSourcemaps = async (state: z.output<typeof sourcemapSchema>) => {
		const files = glob.sync('**/*.map', { cwd: state.source, nodir: true })
		const limit = promiseLimit(16)
		const prefix = formatSourcemapPrefix(state.name, state.hash)

		await Promise.all(
			files.map(file =>
				limit(async () => {
					await client.send(
						new PutObjectCommand({
							Bucket: state.bucket,
							Key: posix.join(prefix, file),
							Body: await readFile(join(state.source, file)),
							ContentType: 'application/json',
						})
					)
				})
			)
		)

		await uploadSourcemapIndex(state)
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
		'sourcemap-deployment': {
			async createResource(props) {
				const state = sourcemapSchema.parse(props.state)

				await uploadSourcemaps(state)

				return state
			},
			async updateResource(props) {
				const prior = sourcemapSchema.parse(props.priorState)
				const proposed = sourcemapSchema.parse(props.proposedState)

				const rekeyed =
					prior.bucket !== proposed.bucket || prior.name !== proposed.name || prior.hash !== proposed.hash

				// The maps live under an immutable hash prefix - a deploy
				// that only published a new version needs just the index.
				if (rekeyed) {
					await uploadSourcemaps(proposed)
				} else if (prior.version !== proposed.version) {
					await uploadSourcemapIndex(proposed)
				}

				return proposed
			},

			// Old maps are never deleted: an aliased version can keep
			// erroring long after later deploys & must stay mappable.
		},
	})
}

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

// Uploads the sourcemaps of a lambda build, keyed by function name &
// build hash - plus a tiny index object mapping the published lambda
// version to that prefix. The on-error-log handler resolves an error's
// version to its maps through the index & fetches them at error time,
// all through plain s3 reads.
export const SourcemapDeployment = createCustomResourceClass<SourcemapDeploymentInput, SourcemapDeploymentOutput>(
	's3',
	'sourcemap-deployment'
)

// The bucket prefix a build's sourcemaps upload under - shared between
// the uploader & the version index that points the error-log handler
// at a deployed version's maps.
export const formatSourcemapPrefix = (name: string, hash: string) => {
	return `sourcemaps/${name}/${hash}/`
}

// The index object a deploy writes for each published version. A build
// hash is hex, so the "versions" segment can never collide with one.
export const formatSourcemapVersionKey = (name: string, version: string) => {
	return `sourcemaps/${name}/versions/${version}`
}

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

	const sourcemapSchema = z.object({
		bucket: z.string(),
		name: z.string(),
		hash: z.string(),
		source: z.string(),
		version: z.string(),
	})

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

		// The version index: reading it is the only lookup the error-log
		// handler needs to find the maps of the version that errored.
		await client.send(
			new PutObjectCommand({
				Bucket: state.bucket,
				Key: formatSourcemapVersionKey(state.name, state.version),
				Body: prefix,
				ContentType: 'text/plain',
			})
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
		'sourcemap-deployment': {
			async createResource(props) {
				const state = sourcemapSchema.parse(props.state)

				await uploadSourcemaps(state)

				return state
			},
			async updateResource(props) {
				const prior = sourcemapSchema.parse(props.priorState)
				const proposed = sourcemapSchema.parse(props.proposedState)

				if (
					prior.bucket !== proposed.bucket ||
					prior.name !== proposed.name ||
					prior.hash !== proposed.hash ||
					prior.version !== proposed.version
				) {
					await uploadSourcemaps(proposed)
				}

				return proposed
			},

			// Old maps are never deleted: an aliased version can keep
			// erroring long after later deploys & must stay mappable.
		},
	})
}

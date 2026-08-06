import { createHash } from 'crypto'
import { createServer, IncomingMessage, Server } from 'http'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { dirname, join, relative, sep } from 'path'
import { DevDispatch, DevReportFailure } from '../../feature.js'
import { decodeAwsChunked, trackConnections } from '../util.js'

export type StoreNotificationRule = {
	id: string
	events: string[]
	prefix: string
}

const readBody = (req: IncomingMessage) => {
	return new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = []
		req.on('data', chunk => chunks.push(chunk))
		req.on('error', reject)
		req.on('end', () => resolve(Buffer.concat(chunks)))
	})
}

const xmlError = (code: string, message: string) => {
	return `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>${code}</Code><Message>${message}</Message></Error>`
}

// S3 event object keys are url encoded with a plus for spaces.
const encodeEventKey = (key: string) => {
	return encodeURIComponent(key).replaceAll('%2F', '/').replaceAll('%20', '+')
}

// A minimal path-style S3 emulator backed by the local filesystem,
// covering the object calls the store runtime uses, plus prefix
// listing. Bucket notifications dispatch into the bundle like the real
// bucket notification config would.
export const createS3Server = (props: { root: string; region: string; rules: StoreNotificationRule[] }) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined
	let dispatch: DevDispatch | undefined
	let reportFailure: DevReportFailure | undefined

	const notify = (eventName: string, bucket: string, key: string, size: number, eTag: string) => {
		for (const rule of props.rules) {
			const matches = rule.events.some(event => {
				const type = event.replace(/^s3:/, '')

				return type === eventName || (type.endsWith('*') && eventName.startsWith(type.slice(0, -1)))
			})

			if (!matches || !key.startsWith(rule.prefix)) {
				continue
			}

			const event = {
				Records: [
					{
						eventVersion: '2.1',
						eventSource: 'aws:s3',
						awsRegion: props.region,
						eventTime: new Date().toISOString(),
						eventName,
						s3: {
							s3SchemaVersion: '1.0',
							configurationId: rule.id,
							bucket: {
								name: bucket,
								ownerIdentity: { principalId: 'local' },
								arn: `arn:aws:s3:::${bucket}`,
							},
							object: {
								key: encodeEventKey(key),
								size,
								eTag,
								sequencer: '0',
							},
						},
					},
				],
			}

			dispatch?.(event).catch(error => {
				reportFailure?.({ kind: 'async', routeKey: rule.id, event, error })
			})
		}
	}

	const handle = async (req: IncomingMessage, res: import('http').ServerResponse) => {
		const url = new URL(req.url ?? '/', 'http://localhost')
		const [bucket, ...keyParts] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
		const key = keyParts.join('/')

		if (!bucket) {
			res.writeHead(400, { 'content-type': 'application/xml' })
			res.end(xmlError('InvalidRequest', 'Missing bucket name'))
			return
		}

		const bucketDir = join(props.root, bucket)
		const file = join(bucketDir, ...keyParts)

		// Objects can never escape the local store folder.
		if (relative(bucketDir, file).startsWith('..')) {
			res.writeHead(400, { 'content-type': 'application/xml' })
			res.end(xmlError('InvalidRequest', 'Invalid object key'))
			return
		}

		// ListObjectsV2
		if (req.method === 'GET' && !key) {
			const prefix = url.searchParams.get('prefix') ?? ''
			const contents: string[] = []

			const walk = async (dir: string) => {
				let entries
				try {
					entries = await readdir(dir, { withFileTypes: true })
				} catch (_) {
					return
				}

				for (const entry of entries) {
					const path = join(dir, entry.name)

					if (entry.isDirectory()) {
						await walk(path)
					} else {
						const objectKey = relative(bucketDir, path).split(sep).join('/')

						if (!objectKey.startsWith(prefix)) {
							continue
						}

						const info = await stat(path)
						contents.push(
							`<Contents><Key>${objectKey}</Key><Size>${info.size}</Size><LastModified>${info.mtime.toISOString()}</LastModified><ETag>&quot;local&quot;</ETag></Contents>`
						)
					}
				}
			}

			await walk(bucketDir)

			res.writeHead(200, { 'content-type': 'application/xml' })
			res.end(
				`<?xml version="1.0" encoding="UTF-8"?>\n<ListBucketResult><Name>${bucket}</Name><Prefix>${prefix}</Prefix><KeyCount>${contents.length}</KeyCount><IsTruncated>false</IsTruncated>${contents.join('')}</ListBucketResult>`
			)
			return
		}

		if (req.method === 'PUT') {
			let body = await readBody(req)

			const encoding = req.headers['content-encoding']
			const sha = req.headers['x-amz-content-sha256']

			if (
				(typeof encoding === 'string' && encoding.includes('aws-chunked')) ||
				(typeof sha === 'string' && sha.startsWith('STREAMING'))
			) {
				body = decodeAwsChunked(body)
			}

			await mkdir(dirname(file), { recursive: true })
			await writeFile(file, body)

			const eTag = createHash('md5').update(body).digest('hex')

			res.writeHead(200, { etag: `"${eTag}"` })
			res.end()

			notify('ObjectCreated:Put', bucket, key, body.length, eTag)
			return
		}

		if (req.method === 'GET' || req.method === 'HEAD') {
			let body: Buffer

			try {
				body = await readFile(file)
			} catch (_) {
				res.writeHead(404, { 'content-type': 'application/xml' })
				res.end(req.method === 'HEAD' ? undefined : xmlError('NoSuchKey', `Key not found: ${key}`))
				return
			}

			res.writeHead(200, {
				'content-length': body.length,
				etag: `"${createHash('md5').update(body).digest('hex')}"`,
			})
			res.end(req.method === 'HEAD' ? undefined : body)
			return
		}

		if (req.method === 'DELETE') {
			await rm(file, { force: true })

			res.writeHead(204)
			res.end()

			notify('ObjectRemoved:Delete', bucket, key, 0, '')
			return
		}

		res.writeHead(501, { 'content-type': 'application/xml' })
		res.end(xmlError('NotImplemented', `The local dev store does not support: ${req.method} ${url.pathname}`))
	}

	return {
		connect(dispatchFn: DevDispatch, reportFailureFn?: DevReportFailure) {
			dispatch = dispatchFn
			reportFailure = reportFailureFn
		},
		// Binds immediately on a free port & returns the actual port, so
		// a stale reserved port can never end up in the environment.
		async listen(port = 0) {
			server = createServer((req, res) => {
				handle(req, res).catch(error => {
					res.writeHead(500, { 'content-type': 'application/xml' })
					res.end(xmlError('InternalError', error instanceof Error ? error.message : String(error)))
				})
			})

			await new Promise<void>((resolve, reject) => {
				server!.once('error', reject)
				closeServer = trackConnections(server!)
				server!.listen(port, '127.0.0.1', () => resolve())
			})

			return (server!.address() as { port: number }).port
		},
		stop() {
			return closeServer?.() ?? Promise.resolve()
		},
	}
}

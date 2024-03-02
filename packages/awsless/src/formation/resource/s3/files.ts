import { Asset, BuildProps, PublishProps } from '../../asset.js'
import { formatByteSize } from '../../../util/byte-size.js'
import { Glob } from 'glob'
import JSZip from 'jszip'
import { Hash, createHash } from 'crypto'
import { createReadStream } from 'fs'
import { join } from 'path'
import { style } from '../../../cli/style.js'

export class Files extends Asset {
	private hash?: string
	private bundle?: Buffer

	private s3?: {
		bucket: string
		key: string
		version: string
	}

	constructor(
		id: string,
		private props: {
			directory: string
			pattern?: string
		}
	) {
		super('bucket', id)
	}

	async build({ write }: BuildProps) {
		const glob = new Glob(this.props.pattern ?? '**/*', {
			nodir: true,
			cwd: this.props.directory,
		})

		const zip = new JSZip()

		const hashes: Hash[] = []
		let count = 0

		for await (const path of glob) {
			const file = join(this.props.directory, path)
			const stream = createReadStream(file)
			const hash = createHash('sha1')

			stream.pipe(hash)
			hashes.push(hash)

			zip.file(path, stream)
			count++
		}

		this.bundle = await zip.generateAsync({
			type: 'nodebuffer',
			compression: 'DEFLATE',
			compressionOptions: {
				level: 9,
			},
		})

		const hash = createHash('sha1')
		for (const item of hashes) {
			hash.update(item.digest())
		}

		this.hash = hash.digest('hex')

		await write(this.hash, async write => {
			await write('HASH', this.hash!)
			await write('bundle.zip', this.bundle!)
		})

		return {
			files: style.success(String(count)),
			size: formatByteSize(this.bundle.byteLength),
		}
	}

	async publish({ publish }: PublishProps) {
		this.s3 = await publish(`${this.id}.zip`, this.bundle!, this.hash!)
	}

	get source() {
		return this.s3
	}
}

// import fs			from 'fs'
// import util			from 'util'
// import AWS			from 'aws-sdk'
// import etagHash		from 'etag-hash'
// import readdir		from 'recursive-readdir'
// import chunk		from 'array-chunk'
// import mime 		from 'mime-types'
// import { queue }	from 'async'
// import path 		from 'path'
// import cspBuilder	from 'content-security-policy-builder'

// readFile = util.promisify fs.readFile

// runJobs = (concurrency, jobs, callback) ->
// 	return new Promise ( resolve ) ->
// 		q = queue callback, concurrency
// 		q.drain resolve
// 		q.push jobs

// export sync = ({ profile, bucket, folder, csp, acl = 'public-read', cacheAge = 31536000, logging = true, ignoredExtensions = [] }) ->

// 	credentials = new AWS.SharedIniFileCredentials {
// 		profile
// 	}

// 	s3 = new AWS.S3 {
// 		apiVersion: '2006-03-01'
// 		credentials
// 	}

// 	data = await s3.listObjectsV2 {
// 		Bucket: bucket
// 	}
// 	.promise()

// 	remoteFiles = data.Contents.map (item) -> {
// 		key: 	item.Key
// 		etag:	item.ETag.substring 1, item.ETag.length - 1
// 	}

// 	localFiles = await readdir folder
// 	localFiles = localFiles.map (file) ->
// 		key = file.replace folder + '/', ''
// 		ext = path.extname file
// 		return { path: file, key, ext }

// 	localFiles = localFiles.filter ({ key, ext }) ->
// 		# return key[0] isnt '.'

// 		if key[0] is '.'
// 			return false

// 		if ignoredExtensions.includes(ext) or ignoredExtensions.includes(ext.substr(1))
// 			return false

// 		return true

// 	await runJobs 25, localFiles, (file) ->
// 		body = await readFile file.path

// 		etag = etagHash
// 			.createHash()
// 			.update body
// 			.digest()

// 		skipUpload = !!remoteFiles.find (item) ->
// 			return item.key is file.key and item.etag is etag

// 		if skipUpload
// 			return

// 		cacheControl = switch mime.lookup file.key
// 			when false, 'text/html', 'application/json', 'application/manifest+json', 'application/manifest', 'text/markdown'
// 				's-maxage=31536000, max-age=0'
// 			else
// 				"public, max-age=#{ cacheAge }, immutable"

// 		metadata = {}
// 		if csp
// 			metadata['Content-Security-Policy'] = cspBuilder {
// 				directives: csp
// 			}

// 		if logging
// 			console.log 'UPLOAD:', file.key

// 		await s3.putObject {
// 			ACL:			acl
// 			Bucket: 		bucket
// 			Body:			body
// 			Key:			file.key
// 			Metadata:		metadata
// 			CacheControl:	cacheControl
// 			ContentType:	mime.contentType(file.ext) or 'text/html; charset=utf-8'
// 		}
// 		.promise()

// 	deleteFiles = remoteFiles.filter (file) ->
// 		skipDelete = !!localFiles.find (item) ->
// 			return item.key is file.key

// 		if skipDelete
// 			return false

// 		if logging
// 			console.log 'DELETE:', file.key

// 		return true

// 	if deleteFiles.length
// 		result = await s3.deleteObjects {
// 			Bucket: bucket
// 			Delete:
// 				Objects: deleteFiles.map (file) -> {
// 					Key: file.key
// 				}
// 		}
// 		.promise()

// 		if result.Errors.length
// 			throw new Error 'Delete Error:' + result.Errors[0]

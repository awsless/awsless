import { Asset } from '../../../resource/asset'
import { Input } from '../../../resource/output'
import { Resource } from '../../../resource/resource'

export type BucketObjectProps = {
	bucket: Input<string>
	key: Input<string>
	body: Input<Asset>
	// deletionPolicy?: 'delete' | 'retain'
	// metadata: Input<Record<>>
}

export class BucketObject extends Resource {
	cloudProviderId = 'aws-s3-bucket-object'

	constructor(id: string, private props: BucketObjectProps) {
		super('AWS::S3::Bucket::Object', id, props)
	}

	get bucket() {
		return this.props.bucket
	}

	get key() {
		return this.props.key
	}

	get version() {
		return this.output<string | undefined>(v => v.VersionId)
	}

	get etag() {
		return this.output<string>(v => v.ETag)
	}

	get checksum() {
		return this.output<string | undefined>(v => v.Checksum)
	}

	// 			ACL:			acl
	// 			Bucket: 		bucket
	// 			Body:			body
	// 			Key:			file.key
	// 			Metadata:		metadata
	// 			CacheControl:	cacheControl
	// 			ContentType:	mime.contentType(file.ext) or 'text/html; charset=utf-8'

	toState() {
		return {
			assets: {
				body: this.props.body,
			},
			document: {
				bucket: this.props.bucket,
				key: this.props.key,
			},
		}
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

import { formatByteSize } from '../../../util/byte-size.js'
import { BuildProps, PublishProps } from '../../asset.js'
import { rollupBundle } from './util/rollup.js'
import { zipFiles } from './util/zip.js'
import { Asset } from '../../asset.js'
// import { createHash } from 'crypto'
// import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { join } from 'path'

export type CodeBundle = (file:string) => Promise<{
	handler: string
	hash: string
	files: File[]
}>

export type File = {
	name: string
	code: Buffer
	map?: Buffer
}

export interface ICode {
	toCodeJson: () => {
		Handler: string
		Code: {
			S3Bucket: string
			S3Key: string
			S3ObjectVersion: string
		} | {
			ZipFile: string
		}
	}
}

export class Code {
	static fromFile(id:string, file:string, bundler?: CodeBundle) {
		return new FileCode(id, file, bundler)
	}

	static fromInline(code: string, handler?: string) {
		return new InlineCode(code, handler)
	}

	static fromInlineFile(id:string, file:string, bundler?: CodeBundle) {
		return new InlineFileCode(id, file, bundler)
	}

	// static fromZipFile(id:string, file:string, hash:string, handler?:string) {
	// 	return new ZipFileCode(id, file, hash, handler)
	// }

	static fromFeature(id:string) {
		const root = fileURLToPath(new URL('.', import.meta.url))
		const file = join(root, `features/${id}.js`)

		return new FileCode(id, file, rollupBundle({
			minify: false,
			handler: 'index.handler',
		}))
	}

	static fromInlineFeature(id:string) {
		const root = fileURLToPath(new URL('.', import.meta.url))
		const file = join(root, `features/${id}.js`)

		return new InlineFileCode(id, file, rollupBundle({
			format: 'cjs',
			minify: false,
			handler: 'index.handler',
		}))
	}
}

export class InlineCode implements ICode {
	constructor(private code: string, private handler: string = 'index.default') {}

	toCodeJson() {
		return {
			Handler: this.handler,
			Code: {
				ZipFile: this.code,
			},
		}
	}
}

export class InlineFileCode extends Asset implements ICode {
	private code?: string
	private handler?: string

	constructor(id: string, private file: string, private bundler?: CodeBundle) {
		super('function', id)
	}

	async build({ write }: BuildProps) {
		const bundler = this.bundler ?? rollupBundle()
		const { hash, files: [ file ], handler } = await bundler(this.file)

		await Promise.all([
			write('HASH', hash),
			write('file.js', file.code),
		])

		this.handler = handler
		this.code = file.code.toString('utf8')

		return {
			size: formatByteSize(file.code.byteLength)
		}
	}

	toCodeJson() {
		return {
			Handler: this.handler ?? '',
			Code: {
				ZipFile: this.code ?? '',
			},
		}
	}
}

// export class ZipFileCode extends Asset implements ICode {
// 	private s3?: {
// 		bucket: string
// 		key: string
// 		version: string
// 	}

// 	constructor(id: string, private file: string, private hash: string, private handler: string = 'index.default') {
// 		super('function', id)
// 	}

// 	async publish({ publish }:PublishProps) {
// 		const bundle = await readFile(this.file)

// 		this.s3 = await publish(
// 			`${ this.id }.zip`,
// 			bundle,
// 			this.hash,
// 		)
// 	}

// 	toCodeJson() {
// 		return {
// 			Handler: this.handler!,
// 			Code: {
// 				S3Bucket: this.s3?.bucket ?? '',
// 				S3Key: this.s3?.key ?? '',
// 				S3ObjectVersion: this.s3?.version ?? '',
// 			},
// 		}
// 	}
// }

// export class FeatureCode extends BundledCode {
// 	constructor(id: string) {
// 		const root = fileURLToPath(new URL('.', import.meta.url))
// 		const file = join(root, `features/${id}.zip`)

// 		super(id, file)
// 	}
// }

export class FileCode extends Asset implements ICode {
	private handler?: string
	private hash?: string
	private bundle?: Buffer
	private s3?: {
		bucket: string
		key: string
		version: string
	}

	constructor(id: string, private file: string, private bundler?: CodeBundle) {
		super('function', id)
	}

	async build({ write }:BuildProps) {
		const bundler = this.bundler ?? rollupBundle()
		const { hash, files, handler } = await bundler(this.file)
		const bundle = await zipFiles(files)

		await Promise.all([
			write('HASH', hash),
			write('bundle.zip', bundle),
			...files.map(file => write(`files/${ file.name }`, file.code)),
			...files.map(file => file.map ? write(`files/${file.name}.map`, file.map) : undefined),
		])

		this.handler = handler
		this.bundle = bundle
		this.hash = hash

		return {
			size: formatByteSize(bundle.byteLength)
		}
	}

	async publish({ publish }:PublishProps) {
		this.s3 = await publish(
			`${ this.id }.zip`,
			this.bundle!,
			this.hash!
		)
	}

	toCodeJson() {
		return {
			Handler: this.handler!,
			Code: {
				S3Bucket: this.s3?.bucket ?? '',
				S3Key: this.s3?.key ?? '',
				S3ObjectVersion: this.s3?.version ?? '',
			},
		}
	}
}

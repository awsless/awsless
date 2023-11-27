import { formatByteSize } from '../../../util/byte-size.js'
import { BuildProps, PublishProps } from '../../asset.js'
import { rollupBundle } from './util/rollup.js'
import { zipFiles } from './util/zip.js'
import { Asset } from '../../asset.js'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { join } from 'path'
import { generateFingerprint } from '../../../util/fingerprint.js'

export type CodeBundle = (file: string) => Promise<{
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
		Code:
			| {
					S3Bucket: string
					S3Key: string
					S3ObjectVersion: string
			  }
			| {
					ZipFile: string
			  }
	}
}

export class Code {
	static fromFile(id: string, file: string, bundler?: CodeBundle) {
		return new FileCode(id, file, bundler)
	}

	static fromInline(code: string, handler?: string) {
		return new InlineCode(code, handler)
	}

	static fromInlineFile(id: string, file: string, bundler?: CodeBundle) {
		return new InlineFileCode(id, file, bundler)
	}

	// static fromZipFile(id:string, file:string, hash:string, handler?:string) {
	// 	return new ZipFileCode(id, file, hash, handler)
	// }

	static fromFeature(id: string) {
		return new FeatureCode(id)
	}

	static fromInlineFeature(id: string) {
		return new InlineFeatureCode(id)
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

	async build({ read, write }: BuildProps) {
		const fingerprint = await generateFingerprint(this.file)

		await write(fingerprint, async write => {
			const bundler = this.bundler ?? rollupBundle()
			const {
				hash,
				files: [file],
				handler,
			} = await bundler(this.file)

			await Promise.all([
				write('HASH', hash),
				write('SIZE', formatByteSize(file.code.byteLength)),
				write('HANDLER', handler),
				write('file.js', file.code),
				file.map && write('file.map', file.map),
			])
		})

		const [handler, size, code] = await read(fingerprint, ['HANDLER', 'SIZE', 'file.js'])

		this.handler = handler.toString('utf8')
		this.code = code.toString('utf8')

		return {
			size: size.toString('utf8'),
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
	private fingerprint?: string
	private handler?: string
	// private hash?: string
	// private bundle?: Buffer
	private s3?: {
		bucket: string
		key: string
		version: string
	}

	constructor(id: string, private file: string, private bundler?: CodeBundle) {
		super('function', id)
	}

	async build({ write, read }: BuildProps) {
		this.fingerprint = await generateFingerprint(this.file)

		// debug('fingerprint', this.id, fingerprint)

		await write(this.fingerprint, async write => {
			const bundler = this.bundler ?? rollupBundle()
			const { hash, files, handler } = await bundler(this.file)
			const bundle = await zipFiles(files)

			await Promise.all([
				write('HASH', hash),
				write('SIZE', formatByteSize(bundle.byteLength)),
				write('HANDLER', handler),
				write('bundle.zip', bundle),
				...files.map(file => write(`files/${file.name}`, file.code)),
				...files.map(file => file.map && write(`files/${file.name}.map`, file.map)),
			])
		})

		const [size] = await read(this.fingerprint, ['SIZE'])

		return {
			size: size.toString('utf8'),
		}
	}

	async publish({ publish, read }: PublishProps) {
		const [hash, handler, bundle] = await read(this.fingerprint!, ['HASH', 'HANDLER', 'bundle.zip'])

		this.handler = handler.toString('utf8')

		this.s3 = await publish(`${this.id}.zip`, bundle, hash)
	}

	toCodeJson() {
		return {
			Handler: this.handler ?? '',
			Code: {
				S3Bucket: this.s3?.bucket ?? '',
				S3Key: this.s3?.key ?? '',
				S3ObjectVersion: this.s3?.version ?? '',
			},
		}
	}
}

export class FeatureCode extends Asset implements ICode {
	private s3?: {
		bucket: string
		key: string
		version: string
	}

	constructor(id: string) {
		super('function', id)
	}

	async publish({ publish }: PublishProps) {
		const root = fileURLToPath(new URL('.', import.meta.url))
		const path = join(root, `features/${this.id}`)
		const bundle = await readFile(join(path, 'bundle.zip'))
		const hash = await readFile(join(path, 'HASH'))

		this.s3 = await publish(`${this.id}.zip`, bundle, hash.toString('utf8'))
	}

	toCodeJson() {
		return {
			Handler: 'index.handler',
			Code: {
				S3Bucket: this.s3?.bucket ?? '',
				S3Key: this.s3?.key ?? '',
				S3ObjectVersion: this.s3?.version ?? '',
			},
		}
	}
}

export class InlineFeatureCode extends Asset implements ICode {
	private code: string | undefined

	constructor(id: string) {
		super('function', id)
	}

	async publish() {
		const root = fileURLToPath(new URL('.', import.meta.url))
		const path = join(root, `features/${this.id}`)
		const file = await readFile(join(path, 'index.js'))

		this.code = file.toString('utf8')
	}

	toCodeJson() {
		return {
			Handler: 'index.handler',
			Code: {
				ZipFile: this.code ?? '',
			},
		}
	}
}

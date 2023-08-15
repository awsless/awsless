import { formatByteSize } from "../../../util/byte-size"
import { BuildProps, PublishProps } from "../../asset"
import { rollupBundle } from "./util/rollup"
import { zipFiles } from "./util/zip"
import { createHash } from "crypto"
import { Asset } from "../../asset"

export type CodeBundle = (file:string) => Promise<{
	handler: string
	hash: string
	files: File[]
}>

export type File = {
	name: string
	code: Buffer | string
	map?: Buffer | string
}

export interface ICode {
	toCodeJson: () => {
		Handler: string
		Code: {
			S3Bucket: string
			S3Key: string
			S3ObjectVersion: string
		}
	}
}

export class Code {
	static fromFile(id:string, file:string, bundler?: CodeBundle) {
		return new FileCode(id, file, bundler)
	}

	static fromInline(id:string, code: string, handler?: string) {
		return new InlineCode(id, code, handler)
	}
}

export class InlineCode extends Asset implements ICode {
	private hash?: string
	private bundle?: Buffer
	private s3?: {
		bucket: string
		key: string
		version: string
	}

	constructor(id: string, private code: string, private handler: string = 'index.default') {
		super('function', id)
	}

	async build({ write }:BuildProps) {
		const hash = createHash('sha1').update(this.code).digest('hex')
		const bundle = await zipFiles([{
			name: 'index.js',
			code: this.code,
		}])

		await Promise.all([
			write('HASH', hash),
			write('bundle.zip', bundle),
			write('files/inline.js', this.code),
		])

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
				S3Bucket: this.s3!.bucket,
				S3Key: this.s3!.key,
				S3ObjectVersion: this.s3!.version,
			},
		}
	}
}

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
		const bundler = this.bundler ?? rollupBundle
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

import { formatByteSize } from '../../../util/byte-size.js'
import { Asset } from '../../asset.js'
// import { readFile } from 'fs/promises'
import { rollupResolver } from './util/rollup.js'

export interface ICode {
	toCodeJson: () => {
		Code?: string
		CodeS3Location?: string
	}
}

export class Code {
	static fromFile(id: string, file: string) {
		return new FileCode(id, file)
	}

	static fromInline(id: string, code: string) {
		return new InlineCode(id, code)
	}
}

export class InlineCode extends Asset implements ICode {
	constructor(id: string, private code: string) {
		super('resolver', id)
	}

	toCodeJson() {
		return {
			Code: this.code,
		}
	}
}

export class FileCode extends Asset implements ICode {
	private code?: string

	constructor(id: string, private file: string) {
		super('resolver', id)
	}

	async build() {
		const code = await rollupResolver({ minify: false })(this.file)

		this.code = code.toString('utf8')

		return {
			size: formatByteSize(code.byteLength),
		}
	}

	toCodeJson() {
		return {
			Code: this.code,
		}
	}
}

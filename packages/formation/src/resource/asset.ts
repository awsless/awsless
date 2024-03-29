import { readFile } from 'fs/promises'

// export interface Asset {
// 	load(): Promise<Buffer> | Buffer
// 	hash: string
// }

export type ResolvedAsset = {
	hash: string
	data: Buffer
}

export abstract class Asset {
	static fromJSON(json: unknown) {
		return new StringAsset(JSON.stringify(json))
	}

	static fromString(string: string, encoding: BufferEncoding = 'utf8') {
		return new StringAsset(string, encoding)
	}

	static fromFile(path: string) {
		return new FileAsset(path)
	}

	static fromRemote(url: URL) {
		return new RemoteAsset(url)
	}

	abstract load(): Promise<Buffer> | Buffer
}

export class StringAsset extends Asset {
	constructor(readonly value: string, readonly encoding: BufferEncoding = 'utf8') {
		super()
	}

	async load() {
		return Buffer.from(this.value, this.encoding)
	}
}

export class FileAsset extends Asset {
	constructor(readonly path: string) {
		super()
	}

	async load() {
		return readFile(this.path)
	}
}

export class RemoteAsset extends Asset {
	constructor(readonly url: URL) {
		super()
	}

	async load() {
		const response = await fetch(this.url)
		const data = await response.arrayBuffer()

		return Buffer.from(data)
	}
}

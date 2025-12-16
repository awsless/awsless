import { kebabCase } from 'change-case'

export type AssetRead = (fingerprint: string, names: string[]) => Promise<Buffer[]>
export type AssetWrite = (
	fingerprint: string,
	cb: (write: (name: string, data: string | Buffer) => Promise<void>) => Promise<void>
) => Promise<void>

export type AssetPublish = (
	name: string,
	data: string | Buffer,
	hash: string | Buffer
) => Promise<{
	bucket: string
	key: string
	version: string
}>

export type BuildProps = {
	read: AssetRead
	write: AssetWrite
}

export type PublishProps = {
	read: AssetRead
	publish: AssetPublish
}

export type Metadata = Record<string, string>

export class Asset {
	readonly id: string

	constructor(
		readonly type: string,
		id: string
	) {
		this.id = kebabCase(id)
	}

	build?(opt: BuildProps): Promise<Metadata | void> | Metadata | void
	publish?(opt: PublishProps): Promise<Metadata | void> | Metadata | void
}

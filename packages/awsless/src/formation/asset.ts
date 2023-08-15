import { paramCase } from "change-case"

export type AssetRead = (name: string) => Promise<Buffer>
export type AssetWrite = (name: string, data: string | Buffer) => Promise<void>
export type AssetPublish = (name: string, data: string | Buffer, hash: string) => Promise<{
	bucket: string
	key: string
	version: string
}>

export type BuildProps = { write: AssetWrite }
export type PublishProps = { read: AssetRead, publish: AssetPublish }
export type Metadata = Record<string, string>

export class Asset {
	readonly id: string

	constructor(readonly type: string, id: string) {
		this.id = paramCase(id)
	}


	build?(opt:BuildProps): Promise<Metadata | void> | Metadata | void
	publish?(opt:PublishProps): Promise<Metadata | void> | Metadata | void

}

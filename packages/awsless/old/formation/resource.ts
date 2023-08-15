import { Stack } from "./stack"
import { formatLogicalId } from "./util"

export type AssetRead = (name: string) => Promise<Buffer>
export type AssetWrite = (name: string, data: string | Buffer) => Promise<void>
export type AssetPublish = (name: string, data: string | Buffer, hash: string) => Promise<{
	bucket: string
	key: string
	version: string
}>

export type BuildProps = { write: AssetWrite }
export type PublishProps = { read: AssetRead, publish: AssetPublish }

// export interface Resource {
// 	// readonly logicalId: string
// 	readonly service: string
// 	readonly resource: string
// 	readonly name: string

// 	readonly build?: (opts:BuildProps) => Promise<void> | void
// 	readonly publish?: (opts:PublishProps) => Promise<void> | void
// 	readonly attrs?: () => Record<string, string | object>
// 	readonly template: () => object
// }

export type Permission = {
	effect?: 'Allow' | 'Deny'
	action: string[]
	resource: string[]
}

// export interface Resource {
// 	readonly permissions?: Permission | Permission[]
// }

export abstract class Resource {
	readonly logicalId: string

	constructor(readonly service: string, readonly resource: string, logicalId: string) {
		this.logicalId = formatLogicalId(logicalId)
	}

	build?(opt:BuildProps): Promise<void> | void
	publish?(opt:PublishProps): Promise<void> | void

	abstract template(stack: Stack): object
}

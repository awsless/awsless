import { StackConfig } from '../schema/stack.js'

export type AssetDetails = Record<string, string>
export type AssetOptions = {
	id:	number
	stack: StackConfig
	resource: string
	resourceName: string
	build?: () => Promise<AssetDetails | void> | AssetDetails | void
	publish?: () => Promise<AssetDetails | void> | AssetDetails | void
}

export class Assets {
	private assets: Record<string, (AssetOptions & {id:number})[]> = {}
	private id = 0

	add(opts:Omit<AssetOptions, 'id'>) {
		if(!this.assets[opts.stack.name]) {
			this.assets[opts.stack.name] = []
		}

		this.assets[opts.stack.name].push({
			...opts,
			id: this.id++,
		})
	}

	list() {
		return this.assets
	}

	forEach(cb:(stack:StackConfig, assets:AssetOptions[]) => void) {
		Object.values(this.assets).forEach(assets => {
			cb(assets[0].stack, assets)
		})
	}

	map(cb:(stack:StackConfig, assets:AssetOptions[]) => Promise<void>) {
		return Object.values(this.assets).map(assets => {
			return cb(assets[0].stack, assets)
		})
	}
}

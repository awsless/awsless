import { StackConfig } from "../schema/stack"

export type AssetDetails = Record<string, string>
export type AssetOptions = {
	stack: StackConfig
	resource: string
	resourceName: string
	build?: () => Promise<AssetDetails | void> | AssetDetails | void
	publish?: () => Promise<AssetDetails | void> | AssetDetails | void
}

export class Assets {
	private assets: Record<string, AssetOptions[]> = {}

	add(opts:AssetOptions) {
		if(!this.assets[opts.stack.name]) {
			this.assets[opts.stack.name] = []
		}

		this.assets[opts.stack.name].push(opts)
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

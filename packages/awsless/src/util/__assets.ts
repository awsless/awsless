
export type AssetDetails = Record<string, string>
export type AssetOptions = {
	id:	number
	stackName: string
	resource: string
	resourceName: string
	build?: () => Promise<AssetDetails | void> | AssetDetails | void
	publish?: () => Promise<AssetDetails | void> | AssetDetails | void
	clean?: () => Promise<void> | void
}

export class Assets {
	private assets: Record<string, (AssetOptions & {id:number})[]> = {}
	private id = 0

	add(opts:Omit<AssetOptions, 'id'>) {
		if(!this.assets[opts.stackName]) {
			this.assets[opts.stackName] = []
		}

		this.assets[opts.stackName].push({
			...opts,
			id: this.id++,
		})
	}

	list() {
		return this.assets
	}

	forEach(cb:(stackName:string, assets:AssetOptions[]) => void) {
		Object.values(this.assets).forEach(assets => {
			cb(assets[0].stackName, assets)
		})
	}

	map(cb:(stackName:string, assets:AssetOptions[]) => Promise<void>) {
		return Object.values(this.assets).map(assets => {
			return cb(assets[0].stackName, assets)
		})
	}
}

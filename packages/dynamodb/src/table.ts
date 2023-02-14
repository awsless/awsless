import { Item } from "./types"

export class Table<Model extends Item, HashKey extends keyof Model, SortKey extends keyof Model = never> {
	declare model: Model
	declare hashKey: HashKey
	declare sortKey: SortKey
	// declare key: Pick<Model, Key>

	constructor(readonly name: string) {}

	toString() {
		return this.name
	}
}

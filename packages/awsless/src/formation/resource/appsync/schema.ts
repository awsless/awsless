import { print } from "graphql"
import { Asset, BuildProps } from "../../asset"
import { readFile } from "fs/promises"
import { mergeTypeDefs } from "@graphql-tools/merge"

export class Schema extends Asset {

	private schema?: string

	constructor(id: string, private files: string | string[]) {
		super('graphql', id)
	}

	async build({ write }: BuildProps) {
		const files = [ this.files ].flat()
		const schemas = await Promise.all(files.map(file => {
			return readFile(file, 'utf8')
		}))

		const defs = mergeTypeDefs(schemas)
		const schema = print(defs)

		await write('schema.gql', schema)

		this.schema = schema
	}

	toDefinition() {
		return this.schema!
	}
}

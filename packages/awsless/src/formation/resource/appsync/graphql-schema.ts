import { print } from 'graphql'
import { Asset, BuildProps } from '../../asset.js'
import { readFile } from 'fs/promises'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { formatByteSize } from '../../../util/byte-size.js'
import { Resource } from '../../resource.js'

export type GraphQLSchemaProps = {
	apiId: string
	definition: Definition
}

export class GraphQLSchema extends Resource {
	constructor(logicalId: string, private props: GraphQLSchemaProps) {
		super('AWS::AppSync::GraphQLSchema', logicalId, [props.definition])
	}

	properties() {
		return {
			ApiId: this.props.apiId,
			Definition: this.props.definition.toString(),
		}
	}
}

export class Definition extends Asset {
	private schema?: string

	constructor(id: string, private files: string | string[]) {
		super('graphql', id)
	}

	async build({ write }: BuildProps) {
		const files = [this.files].flat()
		const fingerprint = files.join('')
		const schemas = await Promise.all(
			files.map(file => {
				return readFile(file, 'utf8')
			})
		)

		const defs = mergeTypeDefs(schemas)
		const schema = print(defs)

		if (schema.length === 0) {
			throw new Error(`Graphql schema definition can't be empty. [${this.id}]`)
		}

		const size = Buffer.from(schema, 'utf8').byteLength
		await write(fingerprint, async write => {
			await write('schema.gql', schema)
		})

		this.schema = schema

		return {
			size: formatByteSize(size),
		}
	}

	toString() {
		return this.schema!
	}
}

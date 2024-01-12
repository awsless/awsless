import { RenderContext } from '../common/context'
import { GraphQLScalarType, GraphQLNamedType, GraphQLSchema, isScalarType } from 'graphql'
import { INDENT } from '../common/indent'

const knownTypes: {
	[name: string]: string
} = {
	Int: 'number',
	Float: 'number',
	String: 'string',
	Boolean: 'boolean',
	ID: 'string',
}

export function renderScalar(schema: GraphQLSchema, ctx: RenderContext) {
	const scalarTypes = Object.values(schema.getTypeMap())
		.filter((type): type is GraphQLScalarType => isScalarType(type))
		.map(type => {
			return `${INDENT}${type.name}: ${getTypeMappedAlias(type, ctx)}\n`
		})
		.join('')

	ctx.add(`export type Scalars = {\n${scalarTypes}}`)
}

const getTypeMappedAlias = (type: GraphQLNamedType, ctx: RenderContext) => {
	const map = { ...knownTypes, ...(ctx?.config?.scalarTypes ?? {}) }
	return map?.[type.name] || 'unknown'
}

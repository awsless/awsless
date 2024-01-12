import {
	GraphQLObjectType,
	GraphQLSchema,
	isInputObjectType,
	isInterfaceType,
	isObjectType,
	isUnionType,
} from 'graphql'
import { RenderContext } from '../common/context'
import { excludedTypes } from '../common/exclude'
import { renderObject } from './type/object'
import { renderInput } from './type/input'
import { renderUnion } from './type/union'
import { requestTypeName } from './name'

export function renderRequest(schema: GraphQLSchema, ctx: RenderContext) {
	const typeMap = schema.getTypeMap()

	for (const name in typeMap) {
		if (excludedTypes.includes(name)) continue

		const type = typeMap[name]

		if (isObjectType(type) || isInterfaceType(type)) renderObject(type, ctx)
		if (isInputObjectType(type)) renderInput(type, ctx)
		if (isUnionType(type)) renderUnion(type, ctx)
	}

	const aliases = [
		{ type: schema.getQueryType(), name: 'QueryRequest' },
		{ type: schema.getMutationType(), name: 'MutationRequest' },
		{ type: schema.getSubscriptionType(), name: 'SubscriptionRequest' },
	]
		.map(renderAlias)
		.filter(Boolean)
		.join('\n')

	ctx.add(aliases)
}

function renderAlias({ type, name }: { type?: GraphQLObjectType | null; name: string }) {
	if (type && requestTypeName(type) !== name) {
		return `export type ${name} = ${requestTypeName(type)}`
	}

	return ''
}

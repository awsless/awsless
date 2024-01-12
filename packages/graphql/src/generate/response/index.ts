import { GraphQLObjectType, GraphQLSchema, isEnumType, isInterfaceType, isObjectType, isUnionType } from 'graphql'
import { RenderContext } from '../common/context'
import { excludedTypes } from '../common/exclude'
import { renderEnum } from './type/enum'
import { renderUnion } from './type/union'
import { renderObject } from './type/object'
import { renderInterface } from './type/interface'

export function renderResponse(schema: GraphQLSchema, ctx: RenderContext) {
	const typeMap = schema.getTypeMap()

	for (const name in typeMap) {
		if (excludedTypes.includes(name)) continue

		const type = typeMap[name]

		if (isEnumType(type)) renderEnum(type, ctx)
		if (isUnionType(type)) renderUnion(type, ctx)
		if (isObjectType(type)) renderObject(type, ctx)
		if (isInterfaceType(type)) renderInterface(type, ctx)
	}

	const aliases = [
		{ type: schema.getQueryType(), name: 'Query' },
		{ type: schema.getMutationType(), name: 'Mutation' },
		{ type: schema.getSubscriptionType(), name: 'Subscription' },
	]
		.map(renderAlias)
		.filter(Boolean)
		.join('\n')

	ctx.add(aliases)
}

function renderAlias({ type, name }: { type?: GraphQLObjectType | null; name: string }) {
	if (type && type.name !== name) {
		return `export type ${name} = ${type.name}`
	}
	return ''
}

import { GraphQLSchema } from 'graphql'
import { RenderContext } from '../common/context'
import { INDENT } from '../common/indent'

export const renderSchema = (schema: GraphQLSchema, ctx: RenderContext) => {
	const types = [
		{ type: schema.getQueryType(), name: 'Query', handle: 'query' },
		{ type: schema.getMutationType(), name: 'Mutation', handle: 'mutate' },
		{ type: schema.getSubscriptionType(), name: 'Subscription', handle: 'subscribe' },
	].filter(type => type.type)

	ctx.add(
		types
			.map(type => {
				return type.type
					? `export type ${type.name}Schema = {\n${INDENT}request: ${type.name}Request\n${INDENT}response: ${type.name}\n}`
					: ''
			})
			.join('\n')
	)

	ctx.add(
		`export type Schema = {${types.map(type => `\n${INDENT}${type.handle}: ${type.name}Schema`).join('')}\n}`
	)
}

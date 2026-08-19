import { GraphQLUnionType } from 'graphql'
import { typeComment } from '../../common/comment'
import { RenderContext } from '../../common/context'
import { INDENT } from '../../common/indent'
import { requestTypeName } from '../name'

export function renderUnion(type: GraphQLUnionType, ctx: RenderContext) {
	const types = type.getTypes()

	const fieldStrings = types.map(t => `['...on ${t.name}']?: ${requestTypeName(t)}`)

	const commonInterfaces = new Set(
		types
			.map(x => x.getInterfaces?.())
			.flat(10)
			.filter(Boolean)
	)

	fieldStrings.push(
		...Array.from(commonInterfaces).map(type => {
			return `['...on ${type.name}']?: ${requestTypeName(type)}`
		})
	)

	fieldStrings.push('__typename?: boolean | number')

	ctx.add(
		`${typeComment(type)}export type ${requestTypeName(type)} = {\n${fieldStrings
			.map(x => INDENT + x)
			.join('\n')}\n}`
	)
}

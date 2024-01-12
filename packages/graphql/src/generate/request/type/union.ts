import { GraphQLUnionType } from 'graphql'
import { RenderContext } from '../../common/context'
import { requestTypeName } from '../name'
import { typeComment } from '../../common/comment'
import { INDENT } from '../../common/indent'

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

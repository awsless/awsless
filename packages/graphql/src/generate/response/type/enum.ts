import { GraphQLEnumType } from 'graphql'
import { RenderContext } from '../../common/context'
import { typeComment } from '../../common/comment'

export function renderEnum(type: GraphQLEnumType, ctx: RenderContext) {
	const values = type.getValues().map(v => `'${v.name}'`)
	ctx.add(`${typeComment(type)}export type ${type.name} = ${values.join(' | ')}`)
}

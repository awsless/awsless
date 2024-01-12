import { GraphQLInputObjectType } from 'graphql'
import { RenderContext } from '../../common/context'
import { argumentComment, typeComment } from '../../common/comment'
import { INDENT } from '../../common/indent'
import { renderSep, renderType } from '../../common/type'

export function renderInput(type: GraphQLInputObjectType, ctx: RenderContext) {
	const fields = type.getFields()

	const fieldStrings = Object.keys(fields).map(fieldName => {
		const field = fields[fieldName]
		return `${argumentComment(field)}${INDENT}${field.name}${renderSep(field.type)} ${renderType(
			field.type
		)}\n`
	})

	ctx.add(`${typeComment(type)}export type ${type.name} = {\n${fieldStrings.join('')}}`)
}

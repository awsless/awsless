import { GraphQLInterfaceType, GraphQLObjectType, isObjectType } from 'graphql'
import { RenderContext } from '../../common/context'
import { fieldComment, typeComment } from '../../common/comment'
import { INDENT } from '../../common/indent'
import { renderSep, renderType } from '../../common/type'

export function renderObject(type: GraphQLObjectType | GraphQLInterfaceType, ctx: RenderContext) {
	const fieldsMap = type.getFields()

	const fields = Object.keys(fieldsMap).map(fieldName => fieldsMap[fieldName])

	if (!ctx.schema) throw new Error('no schema provided')

	const typeNames = isObjectType(type) ? [type.name] : ctx.schema.getPossibleTypes(type).map(t => t.name)

	const fieldStrings = fields
		.map(f => {
			return [
				`${fieldComment(f)}${f.name}${renderSep(f.type)} ${renderType(f.type)}`,
				`${fieldComment(f)}[key: \`\${string}:${f.name}\`]: ${renderType(f.type)}`,
				'',
			]
		})
		.flat(1)

	fieldStrings.push(`__typename: ${typeNames.length > 0 ? typeNames.map(t => `'${t}'`).join('|') : 'string'}`)
	fieldStrings.push(
		`[key: \`\${string}:__typename\`]: ${
			typeNames.length > 0 ? typeNames.map(t => `'${t}'`).join('|') : 'string'
		}`
	)

	// add indentation
	const types = fieldStrings.map(x =>
		x
			.split('\n')
			.filter(Boolean)
			.map(l => INDENT + l)
			.join('\n')
	)

	// there is no need to add extensions as in graphql the implemented type must explicitly add the fields
	// const interfaceNames = isObjectType(type)
	//     ? type.getInterfaces().map((i) => i.name)
	//     : []
	// let extensions =
	//     interfaceNames.length > 0 ? ` extends ${interfaceNames.join(',')}` : ''

	ctx.add(`${typeComment(type)}export type ${type.name} = {\n${types.join('\n')}\n}`)
}

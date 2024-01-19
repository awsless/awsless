import {
	GraphQLInterfaceType,
	GraphQLObjectType,
	getNamedType,
	isEnumType,
	isInterfaceType,
	isScalarType,
} from 'graphql'
import { RenderContext } from '../../common/context'
import { requestTypeName } from '../name'
import { fieldComment, typeComment } from '../../common/comment'
import { toArgsString } from './argument'
import { INDENT } from '../../common/indent'

export function renderObject(type: GraphQLObjectType | GraphQLInterfaceType, ctx: RenderContext) {
	const fields = type.getFields()

	const fieldStrings = Object.keys(fields)
		.map(fieldName => {
			const field = fields[fieldName]

			const types: string[] = []
			const resolvedType = getNamedType(field.type)
			const resolvable = !(isEnumType(resolvedType) || isScalarType(resolvedType))
			const argsPresent = field.args.length > 0
			const argsString = toArgsString(field)
			const argsOptional = !argsString.match(/[^?]:/)

			if (argsPresent) {
				types.push(`{ __args${argsOptional ? '?' : ''}: ${argsString} }`)
			}

			if (resolvable) {
				types.push(requestTypeName(resolvedType))
			} else if (!argsPresent) {
				types.push('boolean | number')
			}

			return [
				`${fieldComment(field)}${field.name}?: ${types.join(' & ')}`,
				`${fieldComment(field)}[key: \`\${string}:${field.name}\`]: ${types.join(' & ')}`,
				'',
			]
		})
		.flat(1)

	if (isInterfaceType(type) && ctx.schema) {
		const interfaceProperties = ctx.schema
			.getPossibleTypes(type)
			.map(t => `['...on ${t.name}']?: ${requestTypeName(t)}`)

		fieldStrings.push(...interfaceProperties)
	}

	fieldStrings.push('__typename?: boolean | number')
	fieldStrings.push('[key: `${string}:__typename`]: boolean | number')

	// add indentation
	const types = fieldStrings.map(x =>
		x
			.split('\n')
			.filter(Boolean)
			.map(l => INDENT + l)
			.join('\n')
	)

	ctx.add(`${typeComment(type)}export type ${requestTypeName(type)} = {\n${types.join('\n')}\n}`)
}

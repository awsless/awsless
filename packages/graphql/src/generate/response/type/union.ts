import { GraphQLInterfaceType, GraphQLUnionType } from 'graphql'
import { typeComment } from '../../common/comment'
import { RenderContext } from '../../common/context'
import { INDENT } from '../../common/indent'

// union should produce an object like
// export type ChangeCard = {
// 	__union: SpecialCard | EffectCard;
// 	__resolve: {
// 		['...on SpecialCard']: SpecialCard;
// 		['...on EffectCard']: EffectCard;
// 	}
// }

export function renderUnion(type: GraphQLUnionType, ctx: RenderContext) {
	const typeNames = type.getTypes().map(t => t.name)
	ctx.add(unionLike(type, typeNames))

	// ctx.add(`${typeComment(type)}export type ${type.name} = (${typeNames.join(' | ')}) & { __isUnion?: true }`)

	// const unionProp = `${INDENT}__union: ${typeNames.join(' | ')}`
	// const resolveProp = `${INDENT}__resolve: {\n${typeNames.map(name => {
	// 	return `${INDENT.repeat(2)}on_${name}: ${name}\n`
	// })}\n${INDENT}}`
	// ctx.add(`${typeComment(type)}export type ${type.name} = {\n${unionProp}\n${resolveProp}\n}`)
}

export const unionLike = (type: GraphQLUnionType | GraphQLInterfaceType, typeNames: string[]) => {
	const prop = `${INDENT}__union: {\n${typeNames
		.map(name => {
			return `${INDENT.repeat(2)}['...on ${name}']: ${name}\n`
		})
		.join('')}${INDENT}}`

	return `${typeComment(type)}export type ${type.name} = {\n${prop}\n}`
}

// export const unionType = (type: GraphQLUnionType, ctx: RenderContext) => {
//     const typeNames = type.getTypes().map((t) => t.name)
//     let resolveContent = typeNames
//         .map((name) => `on_${name}?: ${name}`)
//         .join('\n    ')

//     ctx.addCodeBlock(
//         `${typeComment(type)}export type ${type.name}={
//   __union:
//     ${typeNames.join('|')}
//   __resolve: {
//     ${resolveContent}
//   }
//   __typename?: string
// }`,
//     )
// }

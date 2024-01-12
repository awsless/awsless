import { GraphQLInterfaceType } from 'graphql'
import { renderObject } from './object'
import { RenderContext } from '../../common/context'
import { unionLike } from './union'

export function renderInterface(type: GraphQLInterfaceType, ctx: RenderContext) {
	if (!ctx.schema) {
		throw new Error('schema is required to render unionType')
	}

	const typeNames = ctx.schema.getPossibleTypes(type).map(t => t.name)

	if (!typeNames.length) {
		renderObject(type, ctx)
	} else {
		ctx.add(unionLike(type, typeNames))
		// ctx.add(`${typeComment(type)}export type ${type.name} = (${typeNames.join(' | ')}) & { __isUnion?: true }`)
	}
}

// interface should produce an object like
// export type Nameable = {
// 	__interface:{
// 			name:string
// 	};
// 	__resolve:{
// 		['on_Card']: Card;
// 		['on_CardStack']: CardStack;
// 	}
// }

// export const interfaceType = (type: GraphQLInterfaceType, ctx: RenderContext) => {
//     if (!ctx.schema) {
//         throw new Error('schema is req  required to render unionType ')
//     }
//     const typeNames = ctx.schema.getPossibleTypes(type).map((t) => t.name)
//     let resolveContent = typeNames
//         .map((name) => `on_${name}?: ${name}`)
//         .join('\n    ')

//     ctx.addCodeBlock(
//         `${typeComment(type)}export type ${type.name}={
//   __interface:
//     ${typeNames.join('|')}
//   __resolve: {
//     ${resolveContent}
//   }
//   __typename?: string
// }`,
//     )
// }

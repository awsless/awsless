import {
	GraphQLField,
	GraphQLInputType,
	GraphQLNonNull,
	isListType,
	isNamedType,
	isNonNullType,
	isScalarType,
} from 'graphql'
import { argumentComment } from '../../common/comment'
import { renderSep } from '../../common/type'

export const toArgsString = (field: GraphQLField<any, any, any>) => {
	return `{${field.args
		.map(a => {
			// const required = isNonNullType(a.type)
			const type = renderArgumentType(a.type)
			const arg = `Arg<'${renderVariableArgument(a.type)}', ${type}>`
			return `${argumentComment(a)}${a.name}${renderSep(a.type)}${arg} | ${type}`
		})
		.join(',')}}`
}

export const renderArgumentType = (type: GraphQLInputType, required = false): string => {
	if (isNamedType(type)) {
		let typing = type.name

		if (isScalarType(type)) {
			typing = `Scalars['${type.name}']`
		}

		return required ? typing : `(${typing} | undefined)`
	}

	if (isListType(type)) {
		const typing = `${renderArgumentType(type.ofType, false)}[]`
		return required ? typing : `(${typing} | undefined)`
	}

	return renderArgumentType((type as GraphQLNonNull<any>).ofType, isNonNullType(type))
}

export const renderVariableArgument = (type: GraphQLInputType, required = false): string => {
	const end = required ? '!' : ''

	if (isNamedType(type)) {
		return `${type.name}${end}`
	}

	if (isListType(type)) {
		return `[${renderVariableArgument(type.ofType, false)}]${end}`
	}

	return renderVariableArgument((type as GraphQLNonNull<any>).ofType, isNonNullType(type))
}

// export const renderArgument = (type: GraphQLInputType, required: boolean): string => {
// 	if (isNamedType(type)) {
// 		const typeName = type.name
// 		let typing = `Arg<'${typeName}', ${typeName}>`

// 		// if is a scalar use the scalar interface to not expose reserved words
// 		if (isScalarType(type)) {
// 			if (['Float', 'String', 'Boolean'].includes(typeName)) {
// 				typing = `(Arg<'${typeName}${
// 					nonNull ? '!' : ''
// 				}', Scalars['${typeName}']> | Scalars['${typeName}'])`
// 			} else {
// 				typing = `Arg<'${typeName}', Scalars['${typeName}']>`
// 			}
// 		}

// 		return nonNull ? typing : `(${typing} | undefined)`
// 	}

// 	if (isListType(type)) {
// 		const typing = `${renderArgument(type.ofType, false)}[]`
// 		return nonNull ? typing : `(${typing} | undefined)`
// 	}

// 	return renderArgument((type as GraphQLNonNull<any>).ofType, true)
// }

// export const renderScalar = (type: GraphQLInputType, nonNull: boolean, root: boolean): string => {
// 	if (root) {
// 		// return `: ${renderScalar(type, false, false)}`
// 		if (isNonNullType(type)) {
// 			return `: ${renderScalar(type.ofType, true, false)}`
// 		} else {
// 			const rendered = renderScalar(type, true, false)
// 			return `?: ${rendered}`
// 			//  : `?: (${rendered} | null)`
// 		}
// 	}

// 	if (isNamedType(type)) {
// 		const typeName = type.name
// 		let typing = `Arg<'${typeName}', ${typeName}>`

// 		// if is a scalar use the scalar interface to not expose reserved words
// 		if (isScalarType(type)) {
// 			if (['Float', 'String', 'Boolean'].includes(typeName)) {
// 				typing = `(Arg<'${typeName}${
// 					nonNull ? '!' : ''
// 				}', Scalars['${typeName}']> | Scalars['${typeName}'])`
// 			} else {
// 				typing = `Arg<'${typeName}', Scalars['${typeName}']>`
// 			}
// 		}

// 		return nonNull ? typing : `(${typing} | undefined)`
// 	}

// 	if (isListType(type)) {
// 		const typing = `${renderScalar(type.ofType, false, false)}[]`
// 		return nonNull ? typing : `(${typing} | undefined)`
// 	}

// 	return renderScalar((type as GraphQLNonNull<any>).ofType, true, false)
// }

// nonNull: boolean,
// root: boolean,
// undefinableValues: boolean,
// undefinableFields: boolean,

// ]	if (root) {
// 	if (undefinableFields) {
// 		if (isNonNullType(type)) {
// 			return `: ${render(type.ofType, true, false, undefinableValues, undefinableFields, wrap)}`
// 		} else {
// 			const rendered = render(type, true, false, undefinableValues, undefinableFields, wrap)
// 			return undefinableValues ? `?: ${rendered}` : `?: (${rendered} | null)`
// 		}
// 	} else {
// 		return `: ${render(type, false, false, undefinableValues, undefinableFields, wrap)}`
// 	}
// }

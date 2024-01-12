import {
	GraphQLInputType,
	GraphQLNonNull,
	GraphQLOutputType,
	isListType,
	isNamedType,
	isNonNullType,
	isScalarType,
} from 'graphql'

export const renderSep = (type: GraphQLOutputType | GraphQLInputType) => {
	return isNonNullType(type) ? ':' : '?:'
}

export const renderType = (type: GraphQLOutputType | GraphQLInputType, required = false): string => {
	if (isNamedType(type)) {
		let typeName = type.name

		if (isScalarType(type)) {
			typeName = `Scalars['${typeName}']`
		}

		return required ? typeName : `(${typeName} | undefined)`
	}

	if (isListType(type)) {
		const typing = `${renderType(type.ofType, required)}[]`
		return required ? typing : `(${typing} | undefined)`
	}

	return renderType((type as GraphQLNonNull<any>).ofType, isNonNullType(type))
}

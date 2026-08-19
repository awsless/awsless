import { GraphQLField } from 'graphql'
import { renderTyping } from './__type'
import { argumentComment } from './comment'

export const toArgsString = (field: GraphQLField<any, any, any>) => {
	return `{${field.args
		.map(a => `${argumentComment(a)}${a.name}${renderTyping(a.type, false, true, true)}`)
		.join(',')}}`
}

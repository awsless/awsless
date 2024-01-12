import { argumentComment } from './comment'
import { renderTyping } from './__type'
import { GraphQLField } from 'graphql'

export const toArgsString = (field: GraphQLField<any, any, any>) => {
	return `{${field.args
		.map(a => `${argumentComment(a)}${a.name}${renderTyping(a.type, false, true, true)}`)
		.join(',')}}`
}

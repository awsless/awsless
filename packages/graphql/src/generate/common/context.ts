import { GraphQLSchema } from 'graphql'
import { Config } from './config'

export type RenderContext = {
	schema: GraphQLSchema
	config: Config
	add: (code: string) => void
}

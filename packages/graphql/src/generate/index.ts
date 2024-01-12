import { GraphQLSchema } from 'graphql'
import { renderRequest } from './request'
import { RenderContext } from './common/context'
import { Config } from './common/config'
import { renderResponse } from './response'
import { renderSchema } from './schema'
import { renderScalar } from './scalar'

export const generate = (schema: GraphQLSchema, config: Config = {}) => {
	const lines: string[] = []

	const ctx: RenderContext = {
		schema,
		config,
		add(code) {
			lines.push(code)
		},
	}

	const packageName = config.package ?? '@awsless/graphql'
	ctx.add(`import type { Arg } from '${packageName}'`)

	ctx.add('// Scalar Types')
	renderScalar(schema, ctx)

	ctx.add('// Request Types')
	renderRequest(schema, ctx)

	ctx.add('// Response Types')
	renderResponse(schema, ctx)

	ctx.add('// Schema Types')
	renderSchema(schema, ctx)

	return lines.join('\n\n')
}

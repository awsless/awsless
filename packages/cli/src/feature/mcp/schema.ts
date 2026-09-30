import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { BundledFunctionSchema } from '../function/schema.js'
import { RouteSchema } from '../router/schema.js'

// The model reads the tool name to decide when to call, so it's part of
// the prompt. MCP also restricts it to this character set.
const ToolNameSchema = z
	.string()
	.regex(/^[a-zA-Z0-9_-]{1,64}$/, 'Tool names may only contain letters, numbers, dashes & underscores.')

// Any OIDC provider works, since the server only ever verifies tokens.
const AuthSchema = z
	.object({
		issuer: z.url().describe('The authorization server that issues access tokens, e.g. https://auth.example.com'),

		audience: z
			.string()
			.optional()
			.describe(
				[
					'The audience every access token must carry.',
					'Defaults to the MCP server url, which is what RFC 8707 capable providers bind tokens to.',
				].join('\n')
			),

		scopes: z
			.string()
			.array()
			.default([])
			.describe('The scopes advertised to clients. Purely informational - access is decided per tool.'),
	})
	.describe('Leave undefined to serve your MCP server unauthenticated.')

export const McpDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			router: ResourceIdSchema.describe('The router id to link your MCP server with.'),
			path: RouteSchema.describe('The path inside the router to link your MCP server to.'),

			title: z.string().optional().describe('The display name clients show for your MCP server.'),

			instructions: z.string().optional().describe('Usage hints handed to the model when a client connects.'),

			auth: AuthSchema.optional(),
		})
	)
	.describe('Define the global MCP servers.')
	.optional()

// Every hint MCP defines. The cautious values are the defaults, so a
// tool that declares nothing is treated as destructive & open world.
const AnnotationsSchema = z
	.object({
		readOnly: z.boolean().default(false).describe('The tool never modifies anything.'),

		destructive: z
			.boolean()
			.default(true)
			.describe('The tool may destroy or overwrite data. Ignored for read only tools.'),

		idempotent: z
			.boolean()
			.default(false)
			.describe('Calling the tool twice with the same input changes nothing. Ignored for read only tools.'),

		openWorld: z.boolean().default(true).describe('The tool reaches outside your app, like a web search.'),
	})
	.prefault({})
	.describe(
		[
			'Hints that tell an agent harness how careful to be with this tool.',
			'They only steer how the client asks for approval - the client decides, never the server.',
		].join('\n')
	)

export const McpSchema = z
	.record(
		ResourceIdSchema,
		z
			.record(
				ToolNameSchema,
				z.object({
					function: BundledFunctionSchema.describe(
						'The function to expose. Any existing function works - its own input validator becomes the tool schema.'
					),

					description: z
						.string()
						.describe(
							'What the tool does. This is prompt text - the model reads it to decide when to call.'
						),

					title: z.string().optional().describe('The display name agent harnesses show to the user.'),

					omit: z
						.string()
						.array()
						.default([])
						.describe(
							[
								'Input fields to hide from the model.',
								'Use it for the fields a caller injects rather than the model, so exposing an existing function never advertises its internals.',
							].join('\n')
						),

					permissions: z
						.string()
						.array()
						.default([])
						.describe(
							[
								'The permissions a caller needs before the tool is listed or callable.',
								'Matched against the "permissions" claim on the access token.',
							].join('\n')
						),

					annotations: AnnotationsSchema,
				})
			)
			.describe('The tools for your global MCP server.')
	)
	.describe('Define the schema in your stack for your global MCP server.')
	.optional()

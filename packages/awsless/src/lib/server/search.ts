import { AnySchema, define, isServerlessEndpoint, searchClient } from '@awsless/open-search'
import { runTraceStep, trace } from '@awsless/utils'
import { kebabCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { getApp, getStack, isTest } from './util.js'

// The physical index name inside the shared domain, also used by the CLI.
export const formatSearchIndexName = (stackName: string, indexName: string) => {
	return `${kebabCase(stackName)}--${indexName}`
}

export const getSearchProps = (name: string, stack: string = getStack()) => {
	const index = formatSearchIndexName(stack, name)

	return {
		endpoint: process.env.SEARCH_ENDPOINT,
		// Every test file shares one search server, so the per-file app
		// prefix keeps their indexes apart.
		name: isTest() ? `${kebabCase(getApp())}--${index}` : index,
	} as const
}

type SearchMapping = {
	type?: string
	properties?: Record<string, SearchMapping>
}

// Different opensearch types that hold the same javascript value are
// interchangeable between the stack file & the code schema.
const typeGroups = [
	['keyword', 'text'],
	['long', 'double', 'integer', 'float', 'short', 'byte', 'half_float', 'scaled_float'],
]

const compatibleTypes = (a: string, b: string) => {
	return a === b || typeGroups.some(group => group.includes(a) && group.includes(b))
}

// A drifted schema fails loud instead of relying on dynamic mappings
// that don't exist on the deployed index.
export const assertMatchingMappings = (
	label: string,
	declared: SearchMapping,
	defined: SearchMapping,
	path = ''
): void => {
	const declaredProps = declared.properties ?? {}
	const definedProps = defined.properties ?? {}

	for (const field of Object.keys(definedProps)) {
		if (!declaredProps[field]) {
			throw new Error(
				`The schema of search index "${label}" defines the field "${path}${field}", which the stack file doesn't declare.`
			)
		}
	}

	for (const field of Object.keys(declaredProps)) {
		if (!definedProps[field]) {
			throw new Error(
				`The stack file declares the field "${path}${field}" for search index "${label}", which the code schema doesn't define.`
			)
		}
	}

	for (const [field, declaredField] of Object.entries(declaredProps)) {
		const definedField = definedProps[field]!

		if (declaredField.properties || definedField.properties) {
			if (!declaredField.properties || !definedField.properties) {
				throw new Error(
					`The field "${path}${field}" of search index "${label}" is an object on one side but not the other.`
				)
			}

			assertMatchingMappings(label, declaredField, definedField, `${path}${field}.`)
			continue
		}

		if (declaredField.type && definedField.type && !compatibleTypes(declaredField.type, definedField.type)) {
			throw new Error(
				`The field "${path}${field}" of search index "${label}" is a "${definedField.type}" in the code schema but a "${declaredField.type}" in the stack file.`
			)
		}
	}
}

type Transport = {
	request(params: { method?: string; path?: string }, options?: unknown, callback?: unknown): unknown
}

// The request's endpoint, like "_search" or "_doc", from its path: never the
// document id or the query.
const getSearchOperation = (path = '') => {
	return (
		path
			.split('/')
			.find(part => part.startsWith('_'))
			?.split('?')[0] ?? 'index'
	)
}

// A span per request, named by the index, method and endpoint alone: the
// documents and queries stay out of the trace.
const traceTransport = (index: string, transport: Transport) => {
	const request = transport.request.bind(transport)

	transport.request = (params, options, callback) => {
		// A callback caller gets no span: every op of ours awaits the promise.
		if (typeof callback === 'function' || typeof options === 'function') {
			return request(params, options, callback)
		}

		return trace('OpenSearch', () => request(params, options), {
			namespace: 'remote',
			annotations: { search_operation: getSearchOperation(params.path) },
			metadata: { index },
			http: { method: params.method },
			endWith: (response: unknown) => {
				const status = (response as { statusCode?: unknown } | undefined)?.statusCode
				return typeof status === 'number' ? { http: { status } } : {}
			},
			// A refused request (a missing document, a bad query) is an error, a 429 a throttle, the rest a fault.
			endWithError: (error: unknown) => {
				const status = (error as { meta?: { statusCode?: unknown } } | undefined)?.meta?.statusCode
				const errorType = error instanceof Error ? error.name : 'Error'

				if (typeof status !== 'number') {
					return { fault: true, errorType }
				}

				return {
					http: { status },
					errorType,
					...(status === 429 ? { throttle: true } : status >= 500 ? { fault: true } : { error: true }),
				}
			},
		})
	}
}

export interface SearchResources {}

export const Search: SearchResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		const { endpoint, name: index } = getSearchProps(name, stack)
		let client: any

		return {
			name: index,
			endpoint,
			define(schema: AnySchema) {
				if (isTest()) {
					const declared = process.env[`SEARCH_MAPPINGS_${index}`]

					if (declared) {
						assertMatchingMappings(`${stack}.${name}`, JSON.parse(declared), schema.mapping)
					}
				}

				return define(index, schema, () => {
					if (!client) {
						// Serverless collection endpoints need aoss signing.
						client = searchClient({ node: endpoint }, isServerlessEndpoint(endpoint) ? 'aoss' : 'es')
						runTraceStep(undefined, () => traceTransport(index, client.transport))
					}
					return client
				})
			},
		}
	})
})

import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

const code = { file: { nocheck: './hook.ts' } }

describe('rest', () => {
	it('routes the api into the bundle', () => {
		const { app, binds } = createTestApp({
			app: { rest: { hooks: {} } },
			stacks: [{ name: 'stack-1', rest: { hooks: { 'POST /remind': { code } } } }],
		})

		const api = listResources(app, 'aws_apigatewayv2_api')[0]!
		const routes = listResources(app, 'aws_apigatewayv2_route')

		expect(api.input.protocolType).toBe('HTTP')
		expect(routes).toHaveLength(1)
		expect(routes[0]!.input.routeKey).toBe('POST /remind')
		expect(listResources(app, 'aws_apigatewayv2_integration')).toHaveLength(1)
		expect(listResources(app, 'aws_apigatewayv2_domain_name')).toHaveLength(0)
		expect(binds.some(bind => bind.name === 'REST_HOOKS_ENDPOINT')).toBe(true)
	})

	it('maps a custom domain onto the api', () => {
		const { app, binds } = createTestApp({
			app: {
				domains: { main: { domain: 'example.com' } },
				rest: { hooks: { domain: 'main', subDomain: 'api' } },
			},
		})

		expect(listResources(app, 'aws_apigatewayv2_domain_name')[0]!.input.domainName).toBe('api.example.com')
		expect(listResources(app, 'aws_apigatewayv2_api_mapping')).toHaveLength(1)
		expect(binds.find(bind => bind.name === 'REST_HOOKS_ENDPOINT')?.value).toBe('api.example.com')
	})
})

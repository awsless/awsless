import { findInputDeps, getMeta } from '@terraforge/core'
import type { ALBEvent } from 'aws-lambda'
import { describe, expect, it } from 'vitest'
import { fromAlbEvent, isAlbEvent, toAlbResult } from '../src/feature/bundle/server/source'
import { assignRulePriorities } from '../src/feature/load-balancer/util'
import { formatRulePaths } from '../src/feature/router/load-balancer'
import { RoutesSchema } from '../src/feature/router/schema'
import { createTestApp, listResources } from './_kit'

const code = { file: { nocheck: './handler.ts' } }

const HEADERS = ['CloudFront-Viewer-JA4-Fingerprint', 'CloudFront-Viewer-Address']

const createHeadersApp = (props: { pubsub?: boolean; routes?: object } = {}) => {
	const result = createTestApp({
		app: {
			domains: { main: { domain: 'example.com' } },
			router: { main: { domain: 'main' } },
			...(props.pubsub ? { pubsub: { socket: { router: 'main', auth: { code } } } } : {}),
		},
		stacks: [
			{
				name: 'api',
				routes: { main: props.routes ?? { '/identify': { code }, '/events': { code } } },
			},
		],
	})

	result.ready()

	return result
}

const withHeaders = { '/identify': { code, loadBalancer: { cloudfrontHeaders: HEADERS } }, '/events': { code } }

describe('router cloudfront headers schema', () => {
	const parse = (routes: object) => RoutesSchema.safeParse({ main: routes })

	it('should take CloudFront headers on a fixed route & keep the other forms', () => {
		const result = parse({
			'/identify': { code, loadBalancer: { cloudfrontHeaders: HEADERS } },
			'/a/b.json': { code },
		})

		expect(result.success).toBe(true)
		expect(result.data?.main?.['/identify']?.loadBalancer?.cloudfrontHeaders).toEqual(HEADERS)
		expect(result.data?.main?.['/a/b.json']?.loadBalancer).toBeUndefined()
	})

	it.each([['/identify/*'], ['/visitors/{id}'], ['/*']])('should refuse CloudFront headers on %s', pattern => {
		expect(parse({ [pattern]: { code, loadBalancer: { cloudfrontHeaders: HEADERS } } }).success).toBe(false)
		expect(parse({ [pattern]: { code } }).success).toBe(true)
	})

	it('should refuse other headers, duplicates, none, more than 10 & unknown fields', () => {
		const headers = (cloudfrontHeaders: unknown) =>
			parse({ '/identify': { code, loadBalancer: { cloudfrontHeaders } } }).success

		expect(headers(['user-agent'])).toBe(false)
		expect(headers([])).toBe(false)
		expect(headers(['CloudFront-Is-Mobile-Viewer', 'cloudfront-is-mobile-viewer'])).toBe(false)
		expect(headers(Array.from({ length: 11 }, (_, index) => `CloudFront-${index}`))).toBe(false)
		expect(headers(Array.from({ length: 10 }, (_, index) => `CloudFront-${index}`))).toBe(true)
		expect(parse({ '/identify': { code, other: true } }).success).toBe(false)
	})
})

describe('router cloudfront headers', () => {
	it('should add nothing without the option', () => {
		const { app } = createHeadersApp()
		const distribution = listResources(app, 'aws_cloudfront_multitenant_distribution')[0]!

		expect(distribution.input.cacheBehavior).toBeUndefined()
		expect(distribution.input.origin).toHaveLength(1)
		expect(listResources(app, 'aws_cloudfront_origin_request_policy')).toHaveLength(1)
		expect(
			listResources(app, 'aws_cloudfront_function').filter(meta => meta.urn.includes('keep-request-origin'))
		).toEqual([])

		for (const type of [
			'aws_lb',
			'aws_lb_listener',
			'aws_lb_listener_rule',
			'aws_lb_target_group',
			'aws_lb_target_group_attachment',
		]) {
			expect(listResources(app, type)).toHaveLength(0)
		}
	})

	it('should give the path a behavior of its own with the load balancer as origin', () => {
		const { app } = createHeadersApp({ routes: withHeaders })
		const distribution = listResources(app, 'aws_cloudfront_multitenant_distribution')[0]!
		const policy = listResources(app, 'aws_cloudfront_origin_request_policy').find(meta =>
			meta.urn.includes('cloudfront-headers')
		)!
		const keep = listResources(app, 'aws_cloudfront_function').find(meta =>
			meta.urn.includes('keep-request-origin')
		)!

		expect(policy.input.headersConfig).toEqual({
			headerBehavior: 'allViewerAndWhitelistCloudFront',
			headers: { items: HEADERS },
		})
		expect(policy.input.cookiesConfig).toEqual({ cookieBehavior: 'all' })
		expect(policy.input.queryStringsConfig).toEqual({ queryStringBehavior: 'all' })
		expect(keep.input.code).not.toContain('setRouteOrigin(route);')

		const [behavior] = distribution.input.cacheBehavior
		const [defaults] = distribution.input.defaultCacheBehavior

		// The path with & without a trailing slash, so neither skips the headers.
		expect(distribution.input.cacheBehavior.map((item: { pathPattern: string }) => item.pathPattern)).toEqual([
			'/identify',
			'/identify/',
		])
		expect(behavior.pathPattern).toBe('/identify')
		expect(behavior.targetOriginId).toBe('load-balancer')
		expect(findInputDeps(behavior.originRequestPolicyId)).toContain(policy)
		expect(findInputDeps(behavior.functionAssociation)).toContain(keep)
		expect(findInputDeps(behavior.cachePolicyId)).toEqual(findInputDeps(defaults.cachePolicyId))
		expect(findInputDeps(behavior.responseHeadersPolicyId)).toEqual(findInputDeps(defaults.responseHeadersPolicyId))
		expect(behavior.allowedMethods[0].items).toEqual(expect.arrayContaining(['POST', 'OPTIONS']))

		// The origin is the load balancer, which CloudFront only uses once its rule exists.
		const origin = distribution.input.origin.find((item: { id: string }) => item.id === 'load-balancer')

		expect(origin.customOriginConfig[0].originProtocolPolicy).toBe('http-only')
		expect(origin.customHeader[0].headerName).toBe('x-origin-secret')
		expect(origin.customHeader[0].headerValue).toMatch(/^[0-9a-f]{40}$/)
		// The origin hangs off the load balancer only: waiting for the rules
		// would close a loop through the bundle alias.
		expect(findInputDeps(origin.domainName)).toEqual([listResources(app, 'aws_lb')[0]])
	})

	it('should leave the route store entry a function url route', () => {
		const { app } = createHeadersApp({ routes: withHeaders })
		const deployment = listResources(app, 'route-deployment')[0]!

		expect(findInputDeps(deployment.input.routes)).not.toContain(listResources(app, 'aws_lb')[0])
		expect(findInputDeps(deployment.input.routes).map(meta => meta.type)).toContain('function-deployment')
	})

	it('should make one policy per distinct header list', () => {
		const { app } = createHeadersApp({
			routes: {
				'/identify': { code, loadBalancer: { cloudfrontHeaders: HEADERS } },
				'/events': { code, loadBalancer: { cloudfrontHeaders: HEADERS.toReversed() } },
				'/visits': { code, loadBalancer: { cloudfrontHeaders: ['CloudFront-Viewer-Country'] } },
			},
		})
		const policies = listResources(app, 'aws_cloudfront_origin_request_policy').filter(meta =>
			meta.urn.includes('cloudfront-headers')
		)
		const behaviors = listResources(app, 'aws_cloudfront_multitenant_distribution')[0]!.input.cacheBehavior

		expect(policies).toHaveLength(2)
		// Two per route: the path with & without a trailing slash.
		expect(behaviors).toHaveLength(6)
		expect(findInputDeps(behaviors[0].originRequestPolicyId)).toEqual(
			findInputDeps(behaviors[2].originRequestPolicyId)
		)
		expect(findInputDeps(behaviors[4].originRequestPolicyId)).not.toEqual(
			findInputDeps(behaviors[0].originRequestPolicyId)
		)
	})

	it('should forward the path with the origin secret to the live bundle alias', () => {
		const { app } = createHeadersApp({ routes: withHeaders })

		const listener = listResources(app, 'aws_lb_listener')[0]!
		const target = listResources(app, 'aws_lb_target_group')[0]!
		const [rule] = listResources(app, 'aws_lb_listener_rule')
		const permission = listResources(app, 'aws_lambda_permission').find(
			meta => meta.input.principal === 'elasticloadbalancing.amazonaws.com'
		)!
		const attachment = listResources(app, 'aws_lb_target_group_attachment')[0]!
		const alias = listResources(app, 'aws_lambda_alias')[0]!
		const origin = listResources(app, 'aws_cloudfront_multitenant_distribution')[0]!.input.origin.find(
			(item: { id: string }) => item.id === 'load-balancer'
		)

		expect(listResources(app, 'aws_lb')).toHaveLength(1)
		expect(listResources(app, 'aws_lb_listener_rule')).toHaveLength(1)
		expect(listener.input.defaultAction[0].type).toBe('fixed-response')
		expect(target.input.targetType).toBe('lambda')
		expect(target.input.lambdaMultiValueHeadersEnabled).toBe(true)
		expect(findInputDeps(permission.input.qualifier)).toContain(alias)
		expect(findInputDeps(permission.input.sourceArn)).toContain(target)
		expect(findInputDeps(attachment.input.targetId)).toContain(alias)
		expect(attachment.config?.dependsOn?.map(getMeta)).toContain(permission)

		expect(findInputDeps(rule!.input.listenerArn)).toContain(listener)
		expect(rule!.input.condition[0]).toEqual({ pathPattern: { values: ['/identify', '/identify/'] } })
		expect(rule!.input.condition[1].httpHeader).toEqual({
			httpHeaderName: 'x-origin-secret',
			values: [origin.customHeader[0].headerValue],
		})
		expect(findInputDeps(rule!.input.action)).toContain(target)
	})

	it('should only let CloudFront reach its own load balancer', () => {
		const { app } = createHeadersApp({ routes: withHeaders })
		const ingress = listResources(app, 'aws_vpc_security_group_ingress_rule').find(meta =>
			meta.urn.includes('lb-ingress')
		)!

		expect(ingress.input.fromPort).toBe(80)
		expect(findInputDeps(ingress.input.prefixListId).map(meta => meta.type)).toContain(
			'aws_ec2_managed_prefix_list'
		)
	})

	it("should share the pubsub's load balancer", () => {
		const { app } = createHeadersApp({
			pubsub: true,
			routes: {
				'/identify': { code, loadBalancer: { cloudfrontHeaders: HEADERS } },
				'/events': { code, loadBalancer: { cloudfrontHeaders: HEADERS } },
			},
		})
		const listener = listResources(app, 'aws_lb_listener')[0]!
		const rules = listResources(app, 'aws_lb_listener_rule')

		expect(listResources(app, 'aws_lb')).toHaveLength(1)
		expect(listResources(app, 'aws_lb_listener')).toHaveLength(1)
		expect(listener.urn).toContain(':load-balancer:{main}:')
		// Both paths & the pubsub's own rule.
		expect(rules).toHaveLength(3)

		for (const rule of rules) {
			expect(findInputDeps(rule.input.listenerArn)).toContain(listener)
		}

		expect(new Set(rules.map(rule => rule.input.priority)).size).toBe(3)
	})

	it('should keep priorities stable & unique', () => {
		const one = assignRulePriorities(['main:/identify'])
		const two = assignRulePriorities(['main:/identify', 'main:/events'])

		expect(two.get('main:/identify')).toBe(one.get('main:/identify'))
		expect(new Set(two.values()).size).toBe(2)

		for (const priority of two.values()) {
			expect(priority).toBeGreaterThanOrEqual(1)
			expect(priority).toBeLessThanOrEqual(50_000)
		}

		expect(formatRulePaths('/')).toEqual(['/'])
		expect(formatRulePaths('/a')).toEqual(['/a', '/a/'])
	})
})

const albEvent = (props: Partial<ALBEvent> = {}): ALBEvent => ({
	requestContext: { elb: { targetGroupArn: 'arn:aws:elasticloadbalancing:eu-west-1:1:targetgroup/x/y' } },
	httpMethod: 'POST',
	path: '/identify',
	multiValueQueryStringParameters: { 'a%20b': ['1%2F2', 'x+y'], flag: [''] },
	multiValueHeaders: {
		host: ['metrics.example.com'],
		'X-Awsless-Route': ['api:route:identify'],
		'user-agent': ['Mozilla/5.0'],
		cookie: ['a=1', 'b=2'],
		authorization: ['Bearer viewer'],
		'x-awsless-authorization': ['Bearer spoofed'],
		'x-forwarded-for': ['203.0.113.7, 130.176.1.1'],
		'x-forwarded-proto': ['http'],
		'cloudfront-viewer-ja4-fingerprint': ['t13d1516h2_8daaf6152771_02713d6af862'],
	},
	body: 'eyJhIjoxfQ==',
	isBase64Encoded: true,
	...props,
})

describe('bundle load balancer events', () => {
	it('should only take load balancer events', () => {
		expect(isAlbEvent(albEvent())).toBe(true)
		expect(isAlbEvent({ requestContext: { http: {} } })).toBe(false)
		expect(isAlbEvent(undefined)).toBe(false)
	})

	it('should turn a load balancer event into the function url event', () => {
		const event = fromAlbEvent(albEvent())

		expect(event.rawPath).toBe('/identify')
		expect(event.rawQueryString).toBe('a%20b=1%2F2&a%20b=x+y&flag')
		expect(event.queryStringParameters).toEqual({ 'a b': '1/2,x y', flag: '' })
		expect(event.headers).toMatchObject({
			host: 'metrics.example.com',
			'x-awsless-route': 'api:route:identify',
			cookie: 'a=1; b=2',
			authorization: 'Bearer viewer',
			'x-forwarded-proto': 'https',
			'cloudfront-viewer-ja4-fingerprint': 't13d1516h2_8daaf6152771_02713d6af862',
		})
		expect(event.headers['x-awsless-authorization']).toBeUndefined()
		expect(event.cookies).toEqual(['a=1', 'b=2'])
		expect(event.requestContext.http).toMatchObject({
			method: 'POST',
			path: '/identify',
			sourceIp: '130.176.1.1',
			userAgent: 'Mozilla/5.0',
		})
		expect(event.requestContext.domainName).toBe('metrics.example.com')
		expect(event.body).toBe('eyJhIjoxfQ==')
		expect(event.isBase64Encoded).toBe(true)
	})

	it('should read single value events & leave an empty body out', () => {
		const event = fromAlbEvent(
			albEvent({
				multiValueHeaders: undefined,
				multiValueQueryStringParameters: undefined,
				headers: { host: 'example.com' },
				queryStringParameters: { q: 'a%2Bb' },
				body: '',
				isBase64Encoded: false,
			})
		)

		expect(event.queryStringParameters).toEqual({ q: 'a+b' })
		expect(event.rawQueryString).toBe('q=a%2Bb')
		expect(event.body).toBeUndefined()
		expect(event.requestContext.http.userAgent).toBe('')
		expect(event.requestContext.http.sourceIp).toBe('')
	})

	it('should answer in the load balancer shape', () => {
		expect(
			toAlbResult(
				{
					statusCode: 201,
					headers: { 'Content-Type': 'application/json' },
					cookies: ['a=1', 'b=2'],
					body: '{}',
				},
				true
			)
		).toEqual({
			statusCode: 201,
			statusDescription: '201 Created',
			multiValueHeaders: { 'content-type': ['application/json'], 'set-cookie': ['a=1', 'b=2'] },
			body: '{}',
			isBase64Encoded: false,
		})

		expect(toAlbResult({ ok: true }, false)).toEqual({
			statusCode: 200,
			statusDescription: '200 OK',
			headers: { 'content-type': 'application/json' },
			body: '{"ok":true}',
			isBase64Encoded: false,
		})

		expect(toAlbResult({ statusCode: 204 }, true)).toMatchObject({ body: '', multiValueHeaders: {} })
	})
})

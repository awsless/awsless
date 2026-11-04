import { findInputDeps } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

const code = { file: { nocheck: './handler.ts' } }

const HEADERS = ['CloudFront-Viewer-JA4-Fingerprint']

const createLoadBalancerApp = (props: { pubsub?: string[]; headers?: boolean }) => {
	const result = createTestApp({
		app: {
			domains: { main: { domain: 'example.com' } },
			router: { main: { domain: 'main' } },
			pubsub: Object.fromEntries(
				(props.pubsub ?? []).map((id, index) => [id, { router: 'main', path: `/ws${index}`, auth: { code } }])
			),
		},
		stacks: [
			{
				name: 'api',
				routes: {
					main: {
						'/identify': props.headers ? { code, loadBalancer: { cloudfrontHeaders: HEADERS } } : { code },
					},
				},
			},
		],
	})

	result.ready()

	return result
}

const lbTypes = [
	'aws_lb',
	'aws_lb_listener',
	'aws_lb_listener_rule',
	'aws_lb_target_group',
	'aws_ec2_managed_prefix_list',
] as const

describe('load balancer', () => {
	it('should make none without a pubsub or a load balancer route', () => {
		const { app, shared } = createLoadBalancerApp({})

		for (const type of lbTypes) {
			expect(listResources(app, type)).toHaveLength(0)
		}

		expect(shared.has('load-balancer', 'main')).toBe(false)
	})

	it('should make one behind CloudFront that refuses what no rule takes', () => {
		const { app, shared } = createLoadBalancerApp({ headers: true })
		const [lb] = listResources(app, 'aws_lb')
		const [listener] = listResources(app, 'aws_lb_listener')
		const ingress = listResources(app, 'aws_vpc_security_group_ingress_rule').find(meta =>
			meta.urn.includes('lb-ingress')
		)!

		expect(listResources(app, 'aws_lb')).toHaveLength(1)
		expect(lb!.urn).toContain(':load-balancer:{main}:')
		expect(lb!.input.idleTimeout).toBe(120)
		expect(findInputDeps(listener!.input.loadBalancerArn)).toEqual([lb])
		expect(listener!.input.defaultAction[0]).toMatchObject({
			type: 'fixed-response',
			fixedResponse: { statusCode: '403' },
		})
		expect(findInputDeps(ingress.input.prefixListId).map(meta => meta.type)).toEqual([
			'aws_ec2_managed_prefix_list',
		])
		expect(findInputDeps(shared.get('load-balancer', 'main').dnsName)).toEqual([lb])
	})

	it('should give the load balancer a place of its own, also with a pubsub', () => {
		const { app } = createLoadBalancerApp({ pubsub: ['socket'] })
		const [lb] = listResources(app, 'aws_lb')
		const [listener] = listResources(app, 'aws_lb_listener')
		const security = listResources(app, 'aws_security_group').find(meta => meta.urn.endsWith('{lb-security}'))!

		expect(listResources(app, 'aws_lb')).toHaveLength(1)
		expect(lb!.urn).toMatch(/:load-balancer:\{main\}:resource:aws_lb:\{lb\}$/)
		expect(lb!.input.name).toMatch(/^[a-z0-9]+$/)
		expect(listener!.urn).toMatch(/:load-balancer:\{main\}:resource:aws_lb_listener:\{listener\}$/)
		expect(security.urn).toContain(':load-balancer:{main}:')
		expect(security.input.name).toBe('test-app--load-balancer--main')
	})

	it('should forward each pubsub by its own origin secret to its own target group', () => {
		const { app } = createLoadBalancerApp({ pubsub: ['alpha', 'beta'], headers: true })
		const [lb] = listResources(app, 'aws_lb')
		const [listener] = listResources(app, 'aws_lb_listener')
		const rules = listResources(app, 'aws_lb_listener_rule')
		const pubsubRules = rules.filter(meta => meta.urn.endsWith('{listener-rule}'))
		const deployment = listResources(app, 'route-deployment')[0]!

		expect(listResources(app, 'aws_lb')).toHaveLength(1)
		expect(listResources(app, 'aws_lb_listener')).toHaveLength(1)
		expect(lb!.urn).toContain(':load-balancer:{main}:')
		expect(rules).toHaveLength(3)
		expect(new Set(rules.map(rule => rule.input.priority)).size).toBe(3)
		expect(pubsubRules).toHaveLength(2)

		const secrets = pubsubRules.map(rule => {
			expect(findInputDeps(rule.input.listenerArn)).toEqual([listener])
			expect(rule.input.condition).toHaveLength(1)
			expect(rule.input.condition[0].httpHeader.httpHeaderName).toBe('x-origin-secret')

			const [target] = findInputDeps(rule.input.action)

			expect(target!.type).toBe('aws_lb_target_group')
			expect(target!.urn).toBe(
				rule.urn.replace('aws_lb_listener_rule:{listener-rule}', 'aws_lb_target_group:{lb-target}')
			)

			return rule.input.condition[0].httpHeader.values[0]
		})

		expect(new Set(secrets).size).toBe(2)

		// The pubsub tasks take traffic from the shared security group, and
		// wait for their rule before ECS registers them.
		for (const service of listResources(app, 'aws_ecs_service')) {
			expect(service.config?.dependsOn).toHaveLength(1)
		}

		const security = listResources(app, 'aws_security_group').find(meta => meta.urn.endsWith('{lb-security}'))!
		const taskIngress = listResources(app, 'aws_vpc_security_group_ingress_rule').filter(meta =>
			meta.urn.endsWith('{task-ingress}')
		)

		expect(taskIngress).toHaveLength(2)

		for (const rule of taskIngress) {
			expect(findInputDeps(rule.input.referencedSecurityGroupId)).toEqual([security])
		}

		// Both pubsub routes & the header path reach the one load balancer.
		expect(findInputDeps(deployment.input.routes)).toContain(lb)
	})
})

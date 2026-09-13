import { findInputDeps } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

const code = { file: { nocheck: './auth.ts' } }

const createPubSubApp = () =>
	createTestApp({
		app: {
			domains: { main: { domain: 'example.com' } },
			router: { main: { domain: 'main' } },
			pubsub: { main: { router: 'main', auth: { code } } },
		},
		stacks: [{ name: 'stack-1', pubsub: { main: { connected: { code } } } }],
	})

describe('pubsub', () => {
	it('runs the websocket server as a fargate service behind a load balancer', () => {
		const { app } = createPubSubApp()

		expect(listResources(app, 'aws_ecs_cluster').map(meta => meta.input.name)).toContain('test-app-pubsub')
		expect(listResources(app, 'aws_ecs_task_definition')[0]!.input.family).toBe('test-app--pubsub--main')
		expect(listResources(app, 'aws_ecs_service')).toHaveLength(1)
		expect(listResources(app, 'aws_lb')).toHaveLength(1)
		expect(listResources(app, 'aws_appautoscaling_policy')).toHaveLength(1)
		expect(listResources(app, 'aws_elasticache_serverless_cache')).toHaveLength(1)
		expect(listResources(app, 'aws_sns_topic').map(meta => meta.input.name)).toContain(
			'test-app--pubsub-events--main'
		)
	})

	it('subscribes the bundle to the listened events only', () => {
		const { app } = createPubSubApp()
		const subscription = listResources(app, 'aws_sns_topic_subscription')[0]!

		expect(JSON.parse(subscription.input.filterPolicy)).toEqual({ event: ['connected'] })
	})

	it('opens the cache port inside the vpc', () => {
		const { app } = createPubSubApp()
		const rules = listResources(app, 'aws_vpc_security_group_ingress_rule').filter(meta =>
			meta.urn.includes('{cache-rule-')
		)

		expect(rules).toHaveLength(2)
		expect(rules.map(rule => rule.input.cidrIpv4 ?? rule.input.cidrIpv6).toSorted()).toEqual(['0.0.0.0/0', '::/0'])
	})

	it('grants the websocket task only what it calls', () => {
		const { app } = createPubSubApp()
		const service = listResources(app, 'aws_ecs_task_definition')[0]!
		const policy = listResources(app, 'aws_iam_role_policy').find(
			meta => meta.input.name === 'task-policy' && meta.urn.includes('pubsub')
		)!

		// The app wide grants & env reference the bundle's resources,
		// like the asset bucket, which the server never touches.
		const bucket = listResources(app, 'aws_s3_bucket')[0]!
		const bundle = listResources(app, 'aws_lambda_function').find(
			meta => meta.input.functionName === 'test-app--function--bundle'
		)!

		expect(findInputDeps(policy.input.policy)).toContain(bundle)
		expect(findInputDeps(policy.input.policy)).not.toContain(bucket)
		expect(findInputDeps(service.input.containerDefinitions)).not.toContain(bucket)
	})

	it('rejects a pubsub on a router without a domain', () => {
		expect(() =>
			createTestApp({
				app: {
					router: { main: {} },
					pubsub: { main: { router: 'main', auth: { code } } },
				},
			})
		).toThrow('requires the "main" router to have a domain')
	})
})

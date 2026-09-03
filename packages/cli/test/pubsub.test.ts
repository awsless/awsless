import { createHmac } from 'crypto'
import { Output } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createRandomProvider } from '../src/formation/random'
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

	it('protects the origin with a random secret instead of a derivable one', () => {
		const { app, appId } = createPubSubApp()
		const secrets = listResources(app, 'secret')
		const service = listResources(app, 'aws_ecs_task_definition')[0]!

		expect(secrets).toHaveLength(1)

		// The container env carries the secret as an output of the
		// random resource, never as the old hmac of the public app id.
		const derivable = createHmac('sha1', appId).update('test-app--pubsub--main').digest('hex')
		const definition = service.input.containerDefinitions

		expect(definition).toBeInstanceOf(Output)
		expect(JSON.stringify(service.input)).not.toContain(derivable)
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

describe('random secret provider', () => {
	const provider = createRandomProvider()

	it('generates a random hex secret on create', async () => {
		const first = await provider.createResource({ type: 'secret', state: {} })
		const second = await provider.createResource({ type: 'secret', state: {} })

		expect(first.state.value).toMatch(/^[0-9a-f]{64}$/)
		expect(first.state.value).not.toBe(second.state.value)
	})

	it('keeps the secret across updates', async () => {
		const created = await provider.createResource({ type: 'secret', state: { bytes: 16 } })
		const updated = await provider.updateResource({
			type: 'secret',
			priorState: created.state,
			proposedState: { bytes: 16 },
		})

		expect(created.state.value).toMatch(/^[0-9a-f]{32}$/)
		expect(updated.state.value).toBe(created.state.value)
	})
})

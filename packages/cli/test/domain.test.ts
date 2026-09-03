import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

describe('domain', () => {
	it('creates the hosted zone, certificates & mail identity', () => {
		const { app, shared } = createTestApp({
			app: { domains: { main: { domain: 'example.com', dns: [{ type: 'TXT', ttl: '5 minutes', records: ['v'] }] } } },
		})

		const zones = listResources(app, 'aws_route53_zone')
		const records = listResources(app, 'aws_route53_record')

		expect(zones).toHaveLength(1)
		expect(zones[0]!.input.name).toBe('example.com')
		expect(listResources(app, 'check')).toHaveLength(1)
		expect(listResources(app, 'aws_acm_certificate').length).toBeGreaterThan(0)
		expect(listResources(app, 'aws_ses_domain_identity')[0]!.input.domain).toBe('example.com')
		expect(listResources(app, 'aws_ses_configuration_set')[0]!.input.name).toBe('test-app')
		expect(records.some(meta => meta.input.type === 'MX')).toBe(true)
		expect(records.some(meta => meta.input.name === '_dmarc.example.com')).toBe(true)
		expect(records.some(meta => meta.input.name === 'example.com' && meta.input.type === 'TXT')).toBe(true)

		expect(shared.entry('domain', 'zone-id', 'main')).toBeDefined()
		expect(shared.entry('domain', 'certificate-arn', 'main')).toBeDefined()
		expect(shared.entry('domain', 'global-certificate-arn', 'main')).toBeDefined()
	})

	it('requests a separate global certificate outside us-east-1', () => {
		const local = createTestApp({ app: { domains: { main: { domain: 'example.com' } } } })
		const remote = createTestApp({
			app: { region: 'eu-west-1', domains: { main: { domain: 'example.com' } } },
		})

		expect(listResources(remote.app, 'aws_acm_certificate').length).toBeGreaterThan(
			listResources(local.app, 'aws_acm_certificate').length
		)
	})
})

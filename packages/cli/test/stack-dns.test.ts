import { describe, expect, it } from 'vitest'
import { domainFeature } from '../src/feature/domain/index'
import { StackDnsSchema } from '../src/feature/domain/schema'

describe('stack dns records', () => {
	it('parses a record map keyed by domain id', () => {
		const result = StackDnsSchema.parse({
			main: [
				{ name: 'chat', type: 'CNAME', ttl: '5 minutes', records: ['target.example.com'] },
				{ type: 'TXT', ttl: '60 seconds', records: ['v=spf1 -all'] },
			],
		})

		expect(result?.main).toHaveLength(2)
		expect(result?.main?.[0]?.name).toBe('chat')
	})

	it('rejects unknown record types & missing fields', () => {
		expect(() => StackDnsSchema.parse({ main: [{ type: 'WRONG', ttl: '60 seconds', records: [] }] })).toThrow()
		expect(() => StackDnsSchema.parse({ main: [{ type: 'CNAME' }] })).toThrow()
	})

	it('validates that the domain id exists in the app config', () => {
		const appConfig = { domains: { main: { domain: 'example.com' } } } as never
		const known = [{ file: 'todo/stack.jsonc', dns: { main: [] } }] as never[]
		const unknown = [{ file: 'todo/stack.jsonc', dns: { missing: [] } }] as never[]

		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs: known as never })).not.toThrow()
		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs: unknown as never })).toThrow(
			'non existent domain "missing"'
		)
	})

	const record = (name: string | undefined, type = 'CNAME') => ({
		name,
		type,
		ttl: { value: 60n },
		records: ['x'],
	})

	it('rejects the same record defined in two stacks', () => {
		const appConfig = { domains: { main: { domain: 'example.com' } } } as never
		const stackConfigs = [
			{ file: 'a/stack.jsonc', dns: { main: [record('chat')] } },
			{ file: 'b/stack.jsonc', dns: { main: [record('chat')] } },
		] as never

		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs })).toThrow('Conflicting dns record')
	})

	it('rejects a stack record conflicting with an app config record', () => {
		const appConfig = {
			domains: { main: { domain: 'example.com', dns: [record('chat')] } },
		} as never
		const stackConfigs = [{ file: 'a/stack.jsonc', dns: { main: [record('chat')] } }] as never

		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs })).toThrow('the app config')
	})

	it('treats relative & fully qualified names as the same record', () => {
		const appConfig = { domains: { main: { domain: 'example.com' } } } as never
		const stackConfigs = [
			{ file: 'a/stack.jsonc', dns: { main: [record('chat')] } },
			{ file: 'b/stack.jsonc', dns: { main: [record('chat.example.com')] } },
		] as never

		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs })).toThrow('Conflicting dns record')
	})

	it('allows the same name with different record types', () => {
		const appConfig = { domains: { main: { domain: 'example.com' } } } as never
		const stackConfigs = [
			{ file: 'a/stack.jsonc', dns: { main: [record('chat', 'CNAME')] } },
			{ file: 'b/stack.jsonc', dns: { main: [record('chat', 'TXT')] } },
		] as never

		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs })).not.toThrow()
	})

	it('rejects records reserved by the mail setup', () => {
		const appConfig = { domains: { main: { domain: 'example.com' } } } as never
		const stackConfigs = [{ file: 'a/stack.jsonc', dns: { main: [record('_dmarc', 'TXT')] } }] as never

		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs })).toThrow('the mail setup of the domain')
	})

	it('rejects records reserved by a router alias', () => {
		const appConfig = {
			domains: { main: { domain: 'example.com' } },
			router: { web: { domain: 'main', subDomain: 'app' } },
		} as never
		const stackConfigs = [{ file: 'a/stack.jsonc', dns: { main: [record('app.example.com', 'A')] } }] as never

		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs })).toThrow('the "web" router')
	})

	it('allows records next to the reserved names', () => {
		const appConfig = {
			domains: { main: { domain: 'example.com' } },
			router: { web: { domain: 'main' } },
		} as never
		const stackConfigs = [
			{ file: 'a/stack.jsonc', dns: { main: [record('chat', 'A'), record('mail', 'CNAME')] } },
		] as never

		expect(() => domainFeature.onValidate?.({ appConfig, stackConfigs })).not.toThrow()
	})
})

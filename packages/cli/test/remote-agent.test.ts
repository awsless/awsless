import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { proxyEnv } from '../src/dev/children'
import { ExpectedError } from '../src/error'
import { clearAwsCache, getCredentials } from '../src/util/aws'
import { applyRemoteAgentEnv, childProxyEnv, isRemoteAgent } from '../src/util/remote-agent'

const keys = [
	'AWSLESS_REMOTE_AGENT',
	'AWS_ACCESS_KEY_ID',
	'AWS_SECRET_ACCESS_KEY',
	'AWS_SESSION_TOKEN',
	'AWS_PROFILE',
	'AWS_CONFIG_FILE',
	'AWS_SHARED_CREDENTIALS_FILE',
	'AWS_EC2_METADATA_DISABLED',
	'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI',
	'AWS_CONTAINER_CREDENTIALS_FULL_URI',
	'AWS_WEB_IDENTITY_TOKEN_FILE',
	'SKIP_PROMPT',
	'HTTPS_PROXY',
	'https_proxy',
	'HTTP_PROXY',
	'http_proxy',
	'NO_PROXY',
	'no_proxy',
	'AWSLESS_CHILD_HTTPS_PROXY',
	'AWSLESS_CHILD_HTTP_PROXY',
	'AWSLESS_CHILD_https_proxy',
	'AWSLESS_CHILD_http_proxy',
]

describe('remote agent credentials', () => {
	const saved: Record<string, string | undefined> = {}

	beforeEach(() => {
		for (const key of keys) {
			saved[key] = process.env[key]
			delete process.env[key]
		}

		// No profile files, so the provider chain only sees the env.
		process.env.AWS_CONFIG_FILE = '/dev/null/missing'
		process.env.AWS_SHARED_CREDENTIALS_FILE = '/dev/null/missing'
		process.env.AWSLESS_REMOTE_AGENT = '1'
		// Credentials are memoized per process, so each case starts clean.
		clearAwsCache()
	})

	afterEach(() => {
		for (const key of keys) {
			if (saved[key] === undefined) {
				delete process.env[key]
			} else {
				process.env[key] = saved[key]
			}
		}
	})

	it('reads the flag', () => {
		expect(isRemoteAgent()).toBe(true)
		process.env.AWSLESS_REMOTE_AGENT = '0'
		expect(isRemoteAgent()).toBe(false)
	})

	it('resolves credentials from the env vars', async () => {
		process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'
		process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'

		const provider = await getCredentials('any-profile')
		const credentials = await provider()

		expect(credentials.accessKeyId).toBe('AKIAIOSFODNN7EXAMPLE')
		expect(process.env.AWS_EC2_METADATA_DISABLED).toBe('true')
	})

	it('skips prompts & strips the proxy for the cli while keeping it for children', () => {
		process.env.HTTPS_PROXY = 'http://proxy:3128'
		process.env.NO_PROXY = 'localhost'

		applyRemoteAgentEnv()

		expect(process.env.SKIP_PROMPT).toBe('1')
		expect(process.env.HTTPS_PROXY).toBeUndefined()
		expect(process.env.NO_PROXY).toBe('localhost')
		expect(childProxyEnv('HTTPS_PROXY')).toBe('http://proxy:3128')
		expect(childProxyEnv('NO_PROXY')).toBe('localhost')
		expect(proxyEnv()).toStrictEqual({ HTTPS_PROXY: 'http://proxy:3128', NO_PROXY: 'localhost' })

		// Applying twice keeps the remembered value.
		applyRemoteAgentEnv()
		expect(childProxyEnv('HTTPS_PROXY')).toBe('http://proxy:3128')
	})

	it('changes nothing without the flag', () => {
		process.env.AWSLESS_REMOTE_AGENT = '0'
		process.env.HTTPS_PROXY = 'http://proxy:3128'

		applyRemoteAgentEnv()

		expect(process.env.HTTPS_PROXY).toBe('http://proxy:3128')
		expect(process.env.SKIP_PROMPT).toBeUndefined()
	})

	it('fails with an expected error instead of prompting', async () => {
		await expect(getCredentials('any-profile')).rejects.toThrow(ExpectedError)
		await expect(getCredentials('any-profile')).rejects.toThrow(/AWS_ACCESS_KEY_ID/)
	})
})

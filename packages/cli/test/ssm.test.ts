import {
	DeleteParameterCommand,
	GetParameterCommand,
	GetParametersByPathCommand,
	PutParameterCommand,
	SSMClient,
} from '@aws-sdk/client-ssm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppConfig } from '../src/config/app'
import { SsmStore } from '../src/util/ssm'
import { notFound, sent } from './_kit'

const appConfig = { name: 'app', region: 'us-east-1', profile: 'test' } as AppConfig

const mockSsm = (pages: { Name: string; Value?: string }[][]) => {
	return vi.spyOn(SSMClient.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof GetParametersByPathCommand) {
			const index = command.input.NextToken ? Number(command.input.NextToken) : 0

			return {
				Parameters: pages[index],
				NextToken: index + 1 < pages.length ? String(index + 1) : undefined,
			}
		}

		if (command instanceof GetParameterCommand || command instanceof DeleteParameterCommand) {
			throw notFound('ParameterNotFound')
		}

		if (command instanceof PutParameterCommand) {
			return {}
		}

		throw new Error(`Unexpected SSM command: ${command.constructor.name}`)
	})
}

describe('config store', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should list every page & strip the app prefix from the names', async () => {
		const send = mockSsm([
			[{ Name: '/.awsless/app/DATABASE_URL', Value: 'postgres://db' }, { Name: '/.awsless/app/EMPTY' }],
			[{ Name: '/.awsless/app/nested/KEY', Value: 'deep' }],
		])

		const values = await new SsmStore({ credentials: async () => ({}) as never, appConfig }).list()

		expect(values).toEqual({
			DATABASE_URL: 'postgres://db',
			EMPTY: '',
			'nested/KEY': 'deep',
		})
		expect(sent(send, GetParametersByPathCommand).map(command => command.input.Path)).toEqual([
			'/.awsless/app',
			'/.awsless/app',
		])
	})

	it('should address a value under the app prefix', async () => {
		const send = mockSsm([[]])
		const store = new SsmStore({ credentials: async () => ({}) as never, appConfig })

		await store.set('SECRET', 'value')

		expect(sent(send, PutParameterCommand)[0]?.input).toMatchObject({
			Name: '/.awsless/app/SECRET',
			Value: 'value',
			Type: 'SecureString',
			Overwrite: true,
		})
	})

	it('should treat a missing parameter as unset & an already deleted one as done', async () => {
		mockSsm([[]])
		const store = new SsmStore({ credentials: async () => ({}) as never, appConfig })

		await expect(store.get('MISSING')).resolves.toBeUndefined()
		await expect(store.delete('MISSING')).resolves.toBeUndefined()
	})
})

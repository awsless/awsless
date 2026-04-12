import { migrateAppState } from '../src/formation/workspace/state/migrate'

describe('migration', () => {
	it('update state', async () => {
		const state = migrateAppState({
			name: 'app',
			version: 0,
			stacks: {
				'urn:stack-1': {
					name: 'stack-1',
					dependencies: [],
					resources: {
						'urn:resource-1': {
							type: 'resource',
							provider: 'aws',
							input: {},
							output: {},
							dependencies: [],
						},
					},
				},
				'urn:stack-2': {
					name: 'stack-2',
					dependencies: ['urn:stack-1'],
					resources: {
						'urn:resource-2': {
							type: 'resource',
							provider: 'aws',
							input: {},
							output: {},
							dependencies: [],
						},
					},
				},
			},
		})

		expect(state).toStrictEqual({
			name: 'app',
			version: 2,
			stacks: {
				'urn:stack-1': {
					name: 'stack-1',
					nodes: {
						'urn:resource-1': {
							tag: 'resource',
							type: 'resource',
							provider: 'aws',
							input: {},
							output: {},
							dependencies: [],
						},
					},
				},
				'urn:stack-2': {
					name: 'stack-2',
					nodes: {
						'urn:resource-2': {
							tag: 'resource',
							type: 'resource',
							provider: 'aws',
							input: {},
							output: {},
							dependencies: [],
						},
					},
				},
			},
		})
	})
})

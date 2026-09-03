import { randomBytes } from 'node:crypto'
import { createCustomProvider, createCustomResourceClass, Input, Output } from '@terraforge/core'
import { z } from 'zod'

// A random secret generated once at create time & kept across every
// later update, so dependents never rotate unexpectedly. The value
// lives in the deployment state only.

type RandomSecretInput = {
	// The number of random bytes, hex encoded in the value.
	bytes?: Input<number>
}

type RandomSecretOutput = {
	value: Output<string>
}

export const RandomSecret = createCustomResourceClass<RandomSecretInput, RandomSecretOutput>('random', 'secret')

const inputSchema = z.object({
	bytes: z.number().int().positive().default(32),
})

export const createRandomProvider = () => {
	return createCustomProvider('random', {
		secret: {
			async createResource(props) {
				const state = inputSchema.parse(props.state)

				return {
					...state,
					value: randomBytes(state.bytes).toString('hex'),
				}
			},
			async updateResource(props) {
				const prior = z.object({ value: z.string() }).parse(props.priorState)

				return {
					...inputSchema.parse(props.proposedState),
					value: prior.value,
				}
			},
		},
	})
}

import { UUID } from 'crypto'
import { date, define, Input, object, optional, Output, string, tuple, uuid } from '../src'

describe('Infer', () => {
	const posts = define('posts', {
		hash: 'id',
		schema: object({
			id: uuid(),
			color: tuple([string(), string()]),
			title: string(),
			content: optional(string()),
			createdAt: date(),
		}),
	})

	it('infer type check', () => {
		type In = Input<typeof posts>
		type Out = Output<typeof posts>
		type Expectation = {
			id: UUID
			color: [string, string]
			title: string
			content?: string
			createdAt: Date
		}

		expectTypeOf<In>().toEqualTypeOf<Expectation>()
		expectTypeOf<Out>().toEqualTypeOf<Expectation>()
	})
})

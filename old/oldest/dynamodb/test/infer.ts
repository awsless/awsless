import { UUID } from 'crypto'
import { date, define, InferInput, InferOutput, object, string, uuid } from '../src'

describe('Infer', () => {
	const posts = define('posts', {
		hash: 'id',
		schema: object({
			id: uuid(),
			title: string(),
			content: string(),
			createdAt: date(),
		}),
	})

	it('infer type check', () => {
		type In = InferInput<typeof posts>
		type Out = InferOutput<typeof posts>
		type Expectation = {
			id: UUID
			title: string
			content: string
			createdAt: Date
		}

		expectTypeOf<In>().toEqualTypeOf<Expectation>()
		expectTypeOf<Out>().toEqualTypeOf<Expectation>()
	})
})

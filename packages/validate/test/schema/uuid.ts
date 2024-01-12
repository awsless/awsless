import { UUID } from 'crypto'
import { testSchema } from '../_util'
import { Input, Output, parse, uuid } from '../../src'

const schema = uuid()

testSchema('uuid', {
	valid: [
		'00000000-0000-0000-0000-000000000000', // vx
		'857b3f0a-a777-11e5-bf7f-feff819cdc9f', // v1
		'9a7b330a-a736-21e5-af7f-feaf819cdc9f', // v2
		'0a7b330a-a736-35ea-8f7f-feaf019cdc00', // v3
		'c51c80c2-66a1-442a-91e2-4f55b4256a72', // v4
		'5a2de30a-a736-5aea-8f7f-ad0f019cdc00', // v5
	],
	invalid: [
		null,
		undefined,
		true,
		false,
		NaN,
		'',
		'a',
		'00000000-0000-0000-0000-000000000000-1',
		[],
		{},
		new Date(),
		new Set(),
		new Map(),
	],
	validate: value => {
		const result = parse(schema, value)

		expectTypeOf(result).toEqualTypeOf<UUID>()
		expect(result).toBe(value)
	},
})

it('uuid types', () => {
	expectTypeOf<Input<typeof schema>>().toEqualTypeOf<string>()
	expectTypeOf<Output<typeof schema>>().toEqualTypeOf<UUID>()
})

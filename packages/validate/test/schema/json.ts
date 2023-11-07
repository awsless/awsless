import { Input, Output, json, object, parse, string } from '../../src'
import { testSchema } from '../_util'

const schema = json(
	object({
		foo: string(),
	})
)

testSchema('json', {
	valid: ['{"foo":"bar"}'],
	invalid: [undefined, null, '', '{}', {}, { foo: 'bar' }, [], 1, new Set()],
	validate(input) {
		parse(schema, input)
	},
})

it('json types', () => {
	expectTypeOf<Input<typeof schema>>().toEqualTypeOf<string>()
	expectTypeOf<Output<typeof schema>>().toEqualTypeOf<{
		foo: string
	}>()
})

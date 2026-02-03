import { InferInput, InferOutput, json, object, parse, string } from '../../src'
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
	expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<string>()
	expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<{
		foo: string
	}>()
})

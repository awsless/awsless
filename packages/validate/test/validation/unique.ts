import { any, array, number, object, parse, unique } from '../../src'
import { testSchema } from '../_util'

testSchema('unique', {
	valid: [
		[],
		[1, 2, 3],
		['a', 'b', 'c'],
		['1', 1],
		[true, false],
		[{}, {}], // different objects.
		[[], []], // different arrays.
	],
	invalid: [
		[1, 1],
		['1', '1'],
		[null, null],
		[undefined, undefined],
		[true, true],
		[false, false],
	],
	validate: value => {
		parse(array(any(), [unique()]), value)
	},
})

testSchema('unique keyed', {
	valid: [[{ key: 1 }, { key: 2 }]],
	invalid: [[{ key: 1 }, { key: 1 }]],
	validate: value => {
		parse(array(object({ key: number() }), [unique((a, b) => a.key === b.key)]), value)
	},
})

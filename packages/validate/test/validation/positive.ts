import { bigfloat, number, parse, positive } from '../../src'
import { testSchema } from '../_util'

testSchema('positive', {
	valid: [1, 100, 1000],
	invalid: [0, -1, -100, -1000],
	validate: value => {
		parse(bigfloat([positive()]), value)
		parse(number([positive()]), value)
	},
})

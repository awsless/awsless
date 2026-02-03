import { bigfloat, number, parse, pipe, positive } from '../../src'
import { testSchema } from '../_util'

testSchema('positive', {
	valid: [1, 100, 1000],
	invalid: [0, -1, -100, -1000],
	validate: value => {
		parse(pipe(bigfloat(), positive()), value)
		parse(pipe(number(), positive()), value)
	},
})

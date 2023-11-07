import { bigfloat, number, parse, precision } from '../../src'
import { testSchema } from '../_util'

testSchema('precision', {
	valid: [0, 1, 100, 1000, 0.01, 100.01],
	invalid: [0.001, 100.0001],
	validate: value => {
		parse(bigfloat([precision(2)]), value)
		parse(number([precision(2)]), value)
	},
})

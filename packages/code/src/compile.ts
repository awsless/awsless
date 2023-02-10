
import { rollup, RollupOptions } from './rollup/index'

export const compile = async (input, options:RollupOptions = {}) => {
	return rollup(input, {
		external(importee) {
			return importee !== input
		},
		...options
	})
}

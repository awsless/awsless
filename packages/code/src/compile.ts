
import { rollup, RollupOptions } from './rollup/index'

export const compile = async (input:string, options:RollupOptions = {}) => {
	return rollup(input, {
		external(importee) {
			return importee !== input
		},
		...options
	})
}


import { rollup, RollupOptions } from './rollup/index'

export const bundle = async (input:string, options:RollupOptions = {}) => {
	return rollup(input, options)
}

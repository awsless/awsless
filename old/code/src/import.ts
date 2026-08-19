// @ts-ignore
import nodeEval from 'node-eval'
import { rollup, RollupOptions } from './rollup/index'

export const importModule = async (input: string, options: RollupOptions = {}) => {
	const { code } = await rollup(input, {
		format: 'cjs',
		sourceMap: false,
		...options,
	})

	return nodeEval(code, input)
}

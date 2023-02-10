
import { rollup, RollupOptions } from './rollup/index'
import nodeEval from 'node-eval'
// import { runInNewContext } from 'node:vm'

export const importModule = async (input, options:RollupOptions = {}) => {
	const { code } = await rollup(input, {
		format: 'cjs',
		sourceMap: false,
		...options
	})

	// console.log(code)

	// const exports = {}
	// const module = { exports }

	return nodeEval(code, input)

	// console.log(result)


	// eval(code)

	// return module.exports
}

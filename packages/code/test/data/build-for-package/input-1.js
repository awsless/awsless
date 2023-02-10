
import { uuidv1 } from './dep-1.js'
import { uuidv2 } from './dep-2.coffee'
// import { uuidv3 } from './dep-3.ts'

export const test = () => {
	return [
		uuidv1(),
		uuidv2(),
		// uuidv3(),
	]
}

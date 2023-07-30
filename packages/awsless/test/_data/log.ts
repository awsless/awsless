import { getResourceName } from "../../src/node/resource";
import { bigfloat, define, object, string } from '../../../dynamodb/src/index.js'


// import { capitalCase } from "change-case"

// const lol = lambda({
// 	async handle() {
// 		console.log(getResourceName('table', 'stats'))

// 		//@ts-ignore
// 		console.log(Table.stats)
// 	}
// })

export default () => {
	define('lol', {
		hash: 'id',
		schema: object({
			id: string(),
			amount: bigfloat(),
		})
	})

	console.log(getResourceName('table', 'stats'))
}

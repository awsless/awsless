import { getTableName } from "../../src/node/resource";
import { bigfloat, define, object, string } from '../../../dynamodb/src/index.js'

export default () => {
	define('lol', {
		hash: 'id',
		schema: object({
			id: string(),
			amount: bigfloat(),
		})
	})

	console.log(getTableName('table', 'stats'))
}

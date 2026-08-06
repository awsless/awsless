import { h, t } from 'awsless'
import { tasks } from '../table'

export default h.func(async () => {
	const list = await t.scan(tasks)

	return list
})


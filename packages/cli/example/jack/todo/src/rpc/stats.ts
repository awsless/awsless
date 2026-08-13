import { Fn, h } from 'awsless'

export default h.func(async () => {
	const count = await Fn.stats.get('tasks')

	return count
})

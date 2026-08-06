import { h, s } from 'awsless'
import { searchIndex } from '../search'
import { tasks } from '../table'

export default h.table.stream(tasks, async records => {
	const inserts = records.filter(record => record.event === 'insert')

	if (inserts.length === 0) {
		return
	}

	await s.bulk({
		items: inserts.map(record => s.bulkIndexItem(searchIndex, record.keys.id, record.new!)),
	})
})

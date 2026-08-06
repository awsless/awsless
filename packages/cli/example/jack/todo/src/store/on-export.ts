import { h } from 'awsless'

export default h.store.event(async files => {
	for (const file of files) {
		console.log('EXPORT WRITTEN', file.key)
	}
})

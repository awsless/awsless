import { sleepAwait } from 'sleep-await'
import { mysqlClient } from '../client'

export const ping = async () => {
	const client = mysqlClient({})
	try {
		const result = await client.introspection.getTables()
		return result.length === 0
	} catch (error) {
		console.log(error)
		return false
	}
}

export const wait = async (times: number = 10) => {
	for (let count = 0; count < times; count++) {
		if (await ping()) {
			return
		}

		await sleepAwait(100 * count)
	}

	throw new Error('MySQL server is unavailable.')
}

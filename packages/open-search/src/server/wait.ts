import { sleepAwait } from 'sleep-await'
import { searchClient } from "../client"

export const ping = async () => {
	const client = await searchClient()
	try {
		const result = await client.cat.indices({ format: 'json' })
		return result.statusCode === 200 && result.body.length === 0
	} catch(error) {
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

	throw new Error('ElasticSearch server is unavailable')
}

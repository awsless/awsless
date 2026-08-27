import { s } from 'awsless'
import { todoSearch } from './search'

export default async (event: { query: string }) => {
	const result = await s.search(todoSearch, {
		query: {
			// The last term matches as a prefix, so partial words match
			// while typing, like "ken" for "kennedy".
			match_bool_prefix: { title: event.query },
		},
		limit: 20,
	})

	return result.items
}

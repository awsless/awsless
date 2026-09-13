import { h, s, v } from 'awsless'
import { searchIndex } from '../search'

export default h.func(
	v.object({
		query: v.string(),
	}),
	async ({ query }) => {
		const result = await s.search(searchIndex, {
			query: {
				// The last word matches as a prefix, so a search input keeps
				// matching while the user is still typing it.
				match_bool_prefix: { name: query },
			},
		})

		return result
	}
)

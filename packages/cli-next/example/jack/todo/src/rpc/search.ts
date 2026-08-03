import { h, s, v } from 'awsless'
import { searchIndex } from '../search'

export default h.func(
	v.object({
		query: v.string(),
	}),
	async ({ query }) => {
		const result = await s.search(searchIndex, {
			query: {
				match: { name: query },
			},
		})

		return result.items[0]
	}
)

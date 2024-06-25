import { date, define, migrate, number, object, searchClient, string } from '@awsless/open-search'

export default () => {
	const playerTable = define(
		'players',
		object({
			id: string(),
			email: string(),
			name: string(),
			level: number(),
			createdAt: date(),
		}),
		() => {
			return searchClient(
				{
					node: `https://${process.env['SEARCH_STACK_KENNEDY_TEST_DOMAIN']}`,
				},
				'es'
			)
		}
	)

	return migrate(playerTable)
}

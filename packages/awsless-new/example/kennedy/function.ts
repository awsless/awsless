export default () => {
	console.error(Object.keys(process.env))
	const keys: string[] = []
	for (const key of Object.keys(process.env)) {
		if (key.startsWith('CONFIG_')) {
			keys.push(process.env[key]!)
		}
	}
	console.error(keys)
	// if (keys.length > 0) {
	// 	const paths: Record<string, string> = {}

	// 	for (const key of keys) {
	// 		paths[key] = key
	// 	}
}

// import { date, define, migrate, number, object, searchClient, string } from '@awsless/open-search'

// export default () => {
// 	const playerTable = define(
// 		'players',
// 		object({
// 			id: string(),
// 			email: string(),
// 			name: string(),
// 			level: number(),
// 			createdAt: date(),
// 		}),
// 		() => {
// 			return searchClient(
// 				{
// 					node: `https://${process.env['SEARCH_STACK_KENNEDY_1_TEST_DOMAIN']}`,
// 				},
// 				'es'
// 			)
// 		}
// 	)

// 	return migrate(playerTable)
// }

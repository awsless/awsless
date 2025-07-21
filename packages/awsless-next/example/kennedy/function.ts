export default async (event: unknown) => {
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: 'Hello from Kennedy!',
			event,
		}),
	}
}

// export default async (event: unknown) => {
// 	console.log(JSON.stringify(event))

// 	// const response = await fetch('https://fungamess.games/images/games/RsfBWJ9rDtiX1vsbt2p4KdiVlMlQAoTbGEtrSpR9.png')

// 	const response = await fetch(
// 		'https://fungamess.games/images/providers/D8VqScgcywEFhIOqE878BK8hRJhsXovO1wpbnBBb.svg'
// 	)

// 	if (!response.ok) {
// 		throw new Error(`Failed to fetch image: ${response.statusText}`)
// 	}
// 	const imageBuffer = await response.arrayBuffer()

// 	return Buffer.from(imageBuffer).toString('base64')
// }

// import { date, define, indexItem, migrate, number, object, search, searchClient, string } from '@awsless/open-search'
// import { randomUUID } from 'crypto'

// export default async () => {
// 	console.error(`https://${process.env['SEARCH_STACK_KENNEDY_1_TEST_DOMAIN']}`)
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

// 	// const id = randomUUID()

// 	// await migrate(playerTable
// 	// await indexItem(playerTable, id, {
// 	// 	id,
// 	// 	email: 'test@test.com',
// 	// 	name: 'test',
// 	// 	level: 1,
// 	// 	createdAt: new Date(),
// 	// })

// 	const bool: {
// 		must: any[]
// 		filter?: any
// 	} = { must: [] }

// 	const result = await search(playerTable, {
// 		query: { bool },
// 		limit: 10,
// 	})

// 	return result
// }

// export default () => {
// 	console.error(Object.keys(process.env))
// 	const keys: string[] = []
// 	for (const key of Object.keys(process.env)) {
// 		if (key.startsWith('CONFIG_')) {
// 			keys.push(process.env[key]!)
// 		}
// 	}
// 	console.error(keys)
// 	// if (keys.length > 0) {
// 	// 	const paths: Record<string, string> = {}

// 	// 	for (const key of keys) {
// 	// 		paths[key] = key
// 	// 	}
// }

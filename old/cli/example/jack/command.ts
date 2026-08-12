// import { Fn } from '../../src/server.ts'

import { Fn } from '../../src/server'

export default async () => {
	// console.log(options)
	console.log('Command')
	// context.update('Lol')

	// await task('Loading...', async update => {
	// 	await new Promise(resolve => {
	// 		setTimeout(resolve, 5000)
	// 	})

	// 	update('Done')
	// })
	//
	//
	// lambdaClient.set(new LambdaClient({}))

	// console.log(context)

	const result = await Fn.feature1.test()

	return result
}

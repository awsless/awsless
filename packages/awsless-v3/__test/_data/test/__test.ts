// import { createReadStream } from "fs"
// import { join } from "path"
// import { pipeline } from "stream/promises"
// import { Extract } from "unzip"
// import decompress from 'decompress'

// const unzipBundle = async (sourceFile: string, destinationDirectory: string) => {
// 	// await pipeline(
// 	// 	createReadStream(sourceFile),
//   	// 	Extract({ path: destinationDirectory })
// 	// )

// 	await decompress(sourceFile, destinationDirectory)
// }

// describe('unzip', () => {
// 	// it('unzip', async () => {
// 	// 	await unzipBundle(
// 	// 		join(process.cwd(), 'test/_data/files/bundle.zip'),
// 	// 		join(process.cwd(), 'test/_data/files/contents')
// 	// 	)
// 	// })
// })

describe('Test', () => {
	it('random error test', async () => {
		throw new Error('Random Error')
	})

	it('log error', async () => {
		const str =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
		console.log(str)
		throw new Error(str)
	})

	it('log hard error', async () => {
		const str =
			'Loremipsumdolorsitamet,consecteturadipiscingelit,seddoeiusmodtemporincididuntutlaboreetdoloremagnaaliqua.Utenimadminimveniam,quisnostrudexercitationullamcolaborisnisiutaliquipexeacommodoconsequat.Duisauteiruredolorinreprehenderitinvoluptatevelitessecillumdoloreeufugiatnullapariatur.Excepteursintoccaecatcupidatatnonproident,suntinculpaquiofficiadeseruntmollitanimidestlaborum.'
		console.log(str)
		throw new Error(str)
	})

	it('asset error test', async () => {
		expect({
			a: 2,
		}).toBe({
			a: 1,
		})
	})

	it('valid', async () => {
		expect(1).toBe(1)
	})

	it(
		'random test',
		async () => {
			console.log('one')

			await new Promise(resolve => setTimeout(resolve, 100))
		},
		1000 * 100
	)

	it(
		'other random test',
		async () => {
			console.log('two')

			await new Promise(resolve => setTimeout(resolve, 100))
		},
		1000 * 100
	)

	it(
		'more random tests',
		async () => {
			console.log('three')

			await new Promise(resolve => setTimeout(resolve, 100))

			console.log('done')
		},
		1000 * 100
	)
})

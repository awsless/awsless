// import { string } from 'zod'

// const treeshakable = () => {
// 	console.log('treeshake')
// }

export default async (event: unknown) => {
	console.log(event)

	return {
		event,
		date: new Date(),
	}
}

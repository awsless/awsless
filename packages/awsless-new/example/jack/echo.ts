// import { string } from 'zod'

const treeshakable = () => {
	console.log('treeshake')
}

export default async (event: unknown) => {
	return event
}

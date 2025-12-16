import { Instance } from '../../../src/server'

export default async () => {
	// @ts-ignore
	const result = await fetch(Instance.stack.test)

	if (!result.ok) {
		throw new Error(`Failed to connect to instance: ${result.statusText}`)
	}

	const data = await result.text()

	console.log('Connected to instance successfully:', data)

	return data
}

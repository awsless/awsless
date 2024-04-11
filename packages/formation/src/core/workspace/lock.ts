import { URN } from '../resource'
import { StateProvider } from '../state'

export const lockApp = async <T>(stateProvider: StateProvider, urn: URN, fn: () => T): Promise<Awaited<T>> => {
	let release
	try {
		release = await stateProvider.lock(urn)
	} catch (error) {
		throw new Error(`Already in progress: ${urn}`)
	}

	let result: Awaited<T>

	try {
		result = await fn()
	} catch (error) {
		throw error
	} finally {
		await release()
	}

	return result!
}

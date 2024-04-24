import { App } from '../app'
import { StateProvider } from '../state'

export const lockApp = async <T>(stateProvider: StateProvider, app: App, fn: () => T): Promise<Awaited<T>> => {
	let release
	try {
		release = await stateProvider.lock(app.urn)
	} catch (error) {
		throw new Error(`Already in progress: ${app.urn}`)
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

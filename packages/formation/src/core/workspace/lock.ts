import { LockProvider } from '../lock'
import { App } from '../app'

export const lockApp = async <T>(lockProvider: LockProvider, app: App, fn: () => T): Promise<Awaited<T>> => {
	let release
	try {
		release = await lockProvider.lock(app.urn)
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

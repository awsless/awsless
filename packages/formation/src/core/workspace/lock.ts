import { App } from '../app'
import { LockProvider } from '../lock'

export const lockApp = async <T>(lockProvider: LockProvider, app: App, fn: () => T): Promise<Awaited<T>> => {
	let release
	try {
		release = await lockProvider.lock(app.urn)
	} catch (error) {
		throw new Error(`Already in progress: ${app.urn}`)
	}

	const cleanupAndExit = async () => {
		await release()
		process.exit(0)
	}

	process.on('SIGTERM', cleanupAndExit)
	process.on('SIGINT', cleanupAndExit)

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

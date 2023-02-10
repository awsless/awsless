
import net from 'net'

// @ts-ignore
import lockfile from 'proper-lockfile'
import { unlink, access, constants, open } from 'fs/promises'

interface NetworkError extends Error {
    code?: string
}

const random = (min:number, max:number) => {
	return Math.floor(
		( Math.random() * (max - min) ) + min
	)
}

const isAvailable = (port:number):Promise<boolean> => {
	return new Promise((resolve, reject) => {
		const server = net.createServer()

		server.once('error', (error: NetworkError) => {
			(error.code === 'EADDRINUSE') ? resolve(false) : reject(error)
		})

		server.once('listening', () => {
			server.close()
			resolve(true)
		})

		server.listen(port)
	})
}

const prepareLockFile = async (file:string) => {
	try {
		await access(file, constants.W_OK)
	} catch (error) {
		const handle = await open(file, 'w')
		await handle.close()
	}
}

const lock = async (file:string, timeout:number) => {
	try {
		await prepareLockFile(file)

		// @ts-ignore
		await lockfile.lock(file, {
			stale: timeout,
			retries: 0
		})
	} catch(error) {
		return false
	}

	return true
}

const unlock = (file:string) => {
	// @ts-ignore
	return lockfile.unlock(file)
}

export const requestPort = async ({ min = 32768, max = 65535, timeout = 1000 * 60 * 5 } = {}): Promise<[number, () => Promise<void>]> => {
	let times = 10

	while(times--) {
		const port = random(min, max)
		const open = await isAvailable(port)

		if(!open) continue

		const file = `/var/tmp/port-${ port }`

		if(await lock(file, timeout)) {
			return [
				port,
				async () => {
					await unlock(file)
					await unlink(file)
				}
			]
		}
	}

	throw new Error('No port found')
}

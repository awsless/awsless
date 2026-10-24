import { execFile } from 'child_process'
import { createHash, randomUUID } from 'crypto'
import { createWriteStream } from 'fs'
import { chmod, mkdir, rename, rm, stat } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { promisify } from 'util'
import { getAsset, VERSION } from './version'

const exec = promisify(execFile)

const exists = async (path: string) => {
	try {
		await stat(path)
	} catch {
		return false
	}

	return true
}

// One cache per machine instead of per project, since the binary is
// close to a gigabyte once unpacked.
const getDownloadPath = () => {
	return join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'awsless', 'clickhouse')
}

// Streams the asset to disk while hashing it, since the binaries are
// a few hundred megabytes.
const fetchAsset = async (url: string, file: string) => {
	const response = await fetch(url)

	if (!response.ok || !response.body) {
		throw new Error(`Downloading ClickHouse failed with status ${response.status}: ${url}`)
	}

	const hash = createHash('sha256')
	const body = Readable.fromWeb(response.body as any)

	body.on('data', chunk => hash.update(chunk))

	await pipeline(body, createWriteStream(file))

	return hash.digest('hex')
}

// Downloads the pinned ClickHouse binary on first use & returns its
// path. One binary serves the server, the client & clickhouse-local.
export const download = async (): Promise<string> => {
	const asset = getAsset()
	const dir = join(getDownloadPath(), VERSION)
	const file = join(dir, 'clickhouse')

	if (await exists(file)) {
		return file
	}

	console.log(`Downloading ClickHouse ${VERSION}`)

	// Parallel test workers can race on a cold cache, & workers can be
	// threads sharing a pid, so each works in its own staging directory &
	// renames the result into place.
	const staging = join(dir, `staging-${process.pid}-${randomUUID()}`)

	await mkdir(staging, { recursive: true })

	try {
		const archive = join(staging, 'download')
		const digest = await fetchAsset(asset.url, archive)

		if (digest !== asset.sha256) {
			throw new Error(`The ClickHouse download doesn't match its sha256 digest: ${asset.url}`)
		}

		let binary = archive

		if (asset.member) {
			await exec('tar', ['-xzf', archive, '-C', staging, asset.member])
			binary = join(staging, asset.member)
		}

		await chmod(binary, 0o755)

		// The macOS builds unpack themselves on their first run, which
		// crashes a second process starting at the same moment - so that
		// first run happens here, before the binary is shared.
		await exec(binary, ['--version'])

		try {
			await rename(binary, file)
		} catch (error) {
			if (!(await exists(file))) {
				throw error
			}
		}
	} finally {
		await rm(staging, { recursive: true, force: true })
	}

	return file
}

import decompress from 'decompress'
import findCacheDir from 'find-cache-dir'
import { mkdir, readdir, rename, rm, stat } from 'fs/promises'
import { join, resolve } from 'path'

const exists = async (path: string) => {
	try {
		await stat(path)
	} catch (error) {
		return false
	}

	return true
}

// The mac jdk archives nest the java home inside Contents/Home.
const findJavaHome = async (dir: string) => {
	const [root] = await readdir(dir)
	const base = join(dir, root!)
	const macHome = join(base, 'Contents', 'Home')

	return (await exists(macHome)) ? macHome : base
}

// OpenSearch only ships bundles with a linux or windows jdk, while the
// jars themselves are platform independent. Downloading a matching jdk
// for the current platform lets the same bundle run anywhere.
export const downloadJdk = async (version = 17) => {
	const path = resolve(
		findCacheDir({
			name: '@awsless/open-search',
			cwd: process.cwd(),
		}) || ''
	)

	const dir = join(path, `jdk-${version}-${process.platform}-${process.arch}`)

	if (await exists(dir)) {
		return findJavaHome(dir)
	}

	console.log(`Downloading JDK ${version}`)

	const os = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows' : 'linux'
	const arch = process.arch === 'arm64' ? 'aarch64' : 'x64'
	const url = `https://api.adoptium.net/v3/binary/latest/${version}/ga/${os}/${arch}/jdk/hotspot/normal/eclipse`

	const response = await fetch(url)

	if (!response.ok) {
		throw new Error(`Downloading JDK ${version} for ${os}-${arch} failed: ${response.status}`)
	}

	const buffer = Buffer.from(await response.arrayBuffer())

	// Extract into a temp dir & atomically rename into place, so an
	// interrupted or concurrent extraction never leaves a partial jdk
	// behind that passes the exists check.
	const temp = join(path, `.jdk-${version}-${process.platform}-${process.arch}-${process.pid}`)

	await rm(temp, { recursive: true, force: true })
	await mkdir(temp, { recursive: true, mode: '0777' })
	await decompress(buffer, temp)

	try {
		await rename(temp, dir)
	} catch (error) {
		// Another process finished the same extraction first.
		if (!(await exists(dir))) {
			throw error
		}

		await rm(temp, { recursive: true, force: true })
	}

	return findJavaHome(dir)
}

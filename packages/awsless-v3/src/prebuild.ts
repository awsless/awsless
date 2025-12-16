import { mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { prebuild } from './feature/function/prebuild'

const __dirname = dirname(fileURLToPath(import.meta.url))

const builds = {
	rpc: '../src/feature/rpc/server/handle.ts',
	image: '../src/feature/image/server/handle.ts',
	icon: '../src/feature/icon/server/handle.ts',
}

for (const [name, file] of Object.entries(builds)) {
	const output = join(__dirname, 'prebuild', name)
	await mkdir(output, { recursive: true })
	await prebuild(join(__dirname, file), output, ['sharp'])
}

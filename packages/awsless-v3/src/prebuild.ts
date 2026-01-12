import { mkdir } from 'fs/promises'
import { join } from 'path'
import { prebuild } from './feature/function/prebuild'

const cwd = join(process.cwd(), './dist')

const builds = {
	rpc: '../src/feature/rpc/server/handle.ts',
	image: '../src/feature/image/server/handle.ts',
	icon: '../src/feature/icon/server/handle.ts',
}

for (const [name, file] of Object.entries(builds)) {
	const output = join(cwd, 'prebuild', name)
	await mkdir(output, { recursive: true })
	await prebuild(join(cwd, file), output, ['sharp'])
}

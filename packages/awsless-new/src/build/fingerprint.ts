import { createHash } from 'crypto'
import { readFile, readdir, stat } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
// @ts-ignore
import parseStaticImports from 'parse-static-imports'

const extensions = ['js', 'mjs', 'jsx', 'ts', 'mts', 'tsx']

const generateFileHashes = async (file: string, hashes: Map<string, Buffer>) => {
	if (hashes.has(file)) {
		return
	}

	const code = await readModuleFile(file)
	const deps = await findDependencies(file, code)
	const hash = createHash('sha1').update(code).digest()

	hashes.set(file, hash)

	for (const dep of deps) {
		if (dep.startsWith('/')) {
			await generateFileHashes(dep, hashes)
		}
	}
}

export const fingerprintFromFile = async (file: string) => {
	const hashes = new Map<string, Buffer>()

	await generateFileHashes(file, hashes)

	const merge = Buffer.concat(Array.from(hashes.values()).sort())

	return createHash('sha1').update(merge).digest('hex')
}

export const fingerprintFromDirectory = async (dir: string) => {
	const hashes = new Map<string, Buffer>()

	const files = await readdir(dir, { recursive: true })

	for (const file of files) {
		if (extensions.includes(extname(file).substring(1)) && file.at(0) !== '_') {
			await generateFileHashes(join(dir, file), hashes)
		}
	}

	const merge = Buffer.concat(Array.from(hashes.values()).sort())

	return createHash('sha1').update(merge).digest('hex')
}

const readModuleFile = (file: string) => {
	if (file.endsWith('.js')) {
		return readFiles([file, file.substring(0, file.length - 3) + '.ts'])
	}

	if (!basename(file).includes('.')) {
		return readFiles([
			file,
			...extensions.map(exp => `${file}.${exp}`),
			...extensions.map(exp => join(file, `/index.${exp}`)),
		])
	}

	return readFile(file, 'utf8')
}

const readFiles = async (files: string[]) => {
	for (const file of files) {
		try {
			const s = await stat(file)
			if (s.isFile()) {
				return readFile(file, 'utf8')
			}
		} catch (_) {
			continue
		}
	}

	throw new Error(`No such file: ${files.join(', ')}`)
}

const findDependencies = async (file: string, code: string) => {
	const imports = (await parseStaticImports(code)) as { moduleName: string }[]
	return imports
		.map(entry => entry.moduleName)
		.filter(Boolean)
		.map(value => (value?.startsWith('.') ? join(dirname(file), value) : value))
}

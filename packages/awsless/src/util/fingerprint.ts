import { createHash } from 'crypto'
import { readFile, stat } from 'fs/promises'
import { basename, dirname, join } from 'path'
import parseImports from 'parse-imports'

export const generateFingerprint = async (file: string) => {
	const hashes = new Map<string, Buffer>()

	const generate = async (file: string) => {
		if (hashes.has(file)) {
			return
		}

		const code = await readModuleFile(file)
		const deps = await findDependencies(file, code)
		const hash = createHash('sha1').update(code).digest()

		hashes.set(file, hash)

		for (const dep of deps) {
			if (dep.startsWith('/')) {
				await generate(dep)
			}
		}
	}

	await generate(file)

	const merge = Buffer.concat(Array.from(hashes.values()).sort())

	return createHash('sha1').update(merge).digest('hex')
}

const readModuleFile = (file: string) => {
	if (file.endsWith('.js')) {
		return readFiles([file, file.substring(0, file.length - 3) + '.ts'])
	}

	if (!basename(file).includes('.')) {
		const extensions = ['js', 'mjs', 'jsx', 'ts', 'mts', 'tsx']
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
	const imports = Array.from(await parseImports(code))
	return imports
		.map(entry => entry.moduleSpecifier.value!)
		.filter(Boolean)
		.map(value => (value?.startsWith('.') ? join(dirname(file), value) : value))
}

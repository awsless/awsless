import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Future } from './future.ts'

export const file = (path: string, encoding: BufferEncoding = 'utf8') => {
	return new Future<string>(async (resolve, reject) => {
		try {
			const file = await readFile(path, {
				encoding,
			})

			resolve(file)
		} catch (error) {
			reject(error)
		}
	})
}

export const hash = (path: string, algo: string = 'sha256') => {
	return file(path).pipe(file => createHash(algo).update(file).digest('hex'))
}

export const archive = () => {}

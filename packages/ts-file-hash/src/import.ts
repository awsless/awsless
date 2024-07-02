import { dirname, resolve } from 'path'
// @ts-ignore
import parseStaticImports from 'parse-static-imports'

export const findFileImports = async (file: string, code: string) => {
	const imports = (await parseStaticImports(code)) as {
		moduleName: string
	}[]

	return imports
		.map(entry => entry.moduleName)
		.filter(Boolean)
		.map(value => {
			if (value!.startsWith('.')) {
				return resolve(dirname(file), value)
			}

			return value
		})
}

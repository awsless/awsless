
import { rm } from 'fs/promises'
import { join } from 'path'

export const clean = (directory) => {
	return rm(join(process.cwd(), directory), { recursive: true })
}

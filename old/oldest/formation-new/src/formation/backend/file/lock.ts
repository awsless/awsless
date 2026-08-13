import { mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { lock } from 'proper-lockfile'
import { URN } from '../../urn.ts'
import { LockBackend } from '../lock.ts'

export class FileLockBackend implements LockBackend {
	constructor(
		private props: {
			dir: string
		}
	) {}

	private lockFile(urn: URN) {
		return join(this.props.dir, `${urn}.lock`)
	}

	private async mkdir() {
		await mkdir(this.props.dir, {
			recursive: true,
		})
	}

	async insecureReleaseLock(urn: URN) {
		if (await this.locked(urn)) {
			await rm(this.lockFile(urn))
		}
	}

	async locked(urn: URN) {
		const result = await stat(this.lockFile(urn))
		return result.isFile()
	}

	async lock(urn: URN) {
		await this.mkdir()
		return lock(this.lockFile(urn), {
			realpath: false,
		})
	}
}

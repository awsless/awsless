import { mkdir, rm, stat } from 'fs/promises'
import { join } from 'path'
import { lock } from 'proper-lockfile'
import { LockProvider as Provider } from '../../../core/lock'
import { URN } from '../../../core/resource'

export class LockProvider implements Provider {
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

import { URN } from '../../../core/resource'
import { LockProvider as Provider } from '../../../core/lock'
import { join } from 'path'
import { mkdir, stat } from 'fs/promises'
import { lock } from 'proper-lockfile'

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

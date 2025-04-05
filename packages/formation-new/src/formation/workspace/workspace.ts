import { UUID } from 'node:crypto'
import { App } from '../app.ts'
import { LockBackend } from '../backend/lock.ts'
import { StateBackend } from '../backend/state.ts'
import { Provider } from '../provider.ts'
import { lockApp } from './lock.ts'
import { deleteApp } from './procedure/delete-app.ts'
import { deployApp } from './procedure/deploy-app.ts'
import { hydrate } from './procedure/hydrate.ts'

export type ProcedureOptions = {
	filters?: string[]
	idempotentToken?: UUID
}

export type WorkSpaceOptions = {
	providers: Provider[]
	concurrency?: number
	backend: {
		state: StateBackend
		lock: LockBackend
	}
}

export class WorkSpace {
	constructor(protected props: WorkSpaceOptions) {}

	deploy(app: App, options: ProcedureOptions = {}) {
		return lockApp(this.props.backend.lock, app, async () => {
			try {
				await deployApp(app, { ...this.props, ...options })
			} finally {
				await this.destroyProviders()
			}
		})
	}

	delete(app: App, options: ProcedureOptions = {}) {
		return lockApp(this.props.backend.lock, app, async () => {
			try {
				await deleteApp(app, { ...this.props, ...options })
			} finally {
				await this.destroyProviders()
			}
		})
	}

	hydrate(app: App) {
		return hydrate(app, this.props)
	}

	//   refresh(app: App) {
	//     return lockApp(this.props.backend.lock, app, async () => {
	//       try {
	//         await refresh(app, this.props);
	//       } finally {
	//         await this.destroyProviders();
	//       }
	//     });
	//   }

	protected async destroyProviders() {
		await Promise.all(
			this.props.providers.map(p => {
				return p.destroy?.()
			})
		)
	}
}

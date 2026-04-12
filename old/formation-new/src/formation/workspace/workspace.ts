import { UUID } from 'node:crypto'
import { App } from '../app.ts'
import { LockBackend } from '../backend/lock.ts'
import { StateBackend } from '../backend/state.ts'
// import { findInputDeps } from '../input.ts'
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
			// this.resolveDeps(app)

			try {
				await deployApp(app, { ...this.props, ...options })
			} finally {
				await this.destroyProviders()
			}
		})
	}

	delete(app: App, options: ProcedureOptions = {}) {
		return lockApp(this.props.backend.lock, app, async () => {
			// this.resolveDeps(app)

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

	// protected resolveDeps(app: App) {
	// 	// ------------------------------------------------------------------------------
	// 	// Link the input dependencies to our resource if they are in the same stack.
	// 	// If the resource is coming from a different stack we will let our stack depend
	// 	// ------------------------------------------------------------------------------

	// 	for (const resource of app.resources) {
	// 		const deps = findInputDeps(resource.$.input)

	// 		for (const dep of deps) {
	// 			if (dep.tag === 'resource') {
	// 				if (dep.stack.urn === resource.$.stack.urn) {
	// 					resource.$.dependencies.add(dep.urn)
	// 				} else {
	// 					resource.$.stack.dependsOn(dep.stack)
	// 				}
	// 			} else {
	// 				resource.$.dataSourceMetas.add(dep)
	// 			}
	// 		}
	// 	}
	// }

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

import { URN } from './resource'

export interface LockProvider {
	locked(urn: URN): Promise<boolean>
	lock(urn: URN): Promise<() => Promise<void>>
}

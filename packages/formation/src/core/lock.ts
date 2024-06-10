import { URN } from './resource'

export interface LockProvider {
	insecureReleaseLock(urn: URN): Promise<void>
	locked(urn: URN): Promise<boolean>
	lock(urn: URN): Promise<() => Promise<void>>
}

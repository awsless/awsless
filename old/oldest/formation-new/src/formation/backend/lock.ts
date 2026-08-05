import { URN } from '../urn.ts'

export interface LockBackend {
	insecureReleaseLock(urn: URN): Promise<void>
	locked(urn: URN): Promise<boolean>
	lock(urn: URN): Promise<() => Promise<void>>
}

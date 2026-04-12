import { UUID } from 'crypto'
import { v5 } from 'uuid'
import { URN } from '../resource'
import { ResourceOperation } from './workspace'

export const createIdempotantToken = (appToken: UUID, urn: URN, operation: ResourceOperation) => {
	return v5(`${urn}-${operation}`, appToken)
}

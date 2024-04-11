import { URN } from '../resource'
import { ResourceOperation } from './workspace'
import { v5 } from 'uuid'

export const createIdempotantToken = (appToken: string, urn: URN, operation: ResourceOperation) => {
	return v5(`${urn}-${operation}`, appToken)
}

import { Resource } from '../../../core/resource'

export abstract class CloudControlApiResource extends Resource {
	readonly cloudProviderId = 'aws-cloud-control-api'

	// readonly

	// protected _region: string | undefined

	// get region() {
	// 	return this._region
	// }

	// setRegion(region: string) {
	// 	this._region = region
	// 	return this
	// }
}

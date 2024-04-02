import { Resource } from '../../core/resource'

export abstract class AwsResource extends Resource {
	readonly cloudProviderId = 'aws-cloud-control-api'

	// protected _region: string | undefined

	// get region() {
	// 	return this._region
	// }

	// setRegion(region: string) {
	// 	this._region = region
	// 	return this
	// }
}

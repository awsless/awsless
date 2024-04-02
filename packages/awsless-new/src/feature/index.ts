import { functionFeature } from './function/index.js'
import { onFailureFeature } from './on-failure/index.js'
import { queueFeature } from './queue/index.js'
import { tableFeature } from './table/index.js'
import { testFeature } from './test/index.js'

export const features = [
	//
	onFailureFeature,
	functionFeature,
	tableFeature,
	queueFeature,
	testFeature,
]

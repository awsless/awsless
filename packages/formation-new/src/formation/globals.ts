import { file, hash } from './helpers.ts'
import { combine, interpolate, resolve } from './output.ts'

declare global {
	var $resolve: typeof resolve
	var $combine: typeof combine
	var $interpolate: typeof interpolate
	var $hash: typeof hash
	var $file: typeof file
}

globalThis.$resolve = resolve
globalThis.$combine = combine
globalThis.$interpolate = interpolate
globalThis.$hash = hash
globalThis.$file = file

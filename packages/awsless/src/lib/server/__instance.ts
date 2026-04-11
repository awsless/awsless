import { shortId } from '../../util/id.js'
import { createProxy } from '../proxy.js'
import { APP } from './util.js'

export interface InstanceResources {}

export const Instance: InstanceResources = /*@__PURE__*/ createProxy(stack => {
	return createProxy(name => {
		return `http://${shortId(`${stack}:${name}`)}.${APP}`
	})
})

import { baseTypes, SerializableTypes } from './type'

export const setGlobalTypes = (types: SerializableTypes) => {
	Object.assign(baseTypes, types)
}

export type URN = `urn:${string}`

export const createUrn = (tag: string, type: string, name: string, parentUrn?: URN): URN => {
	return `${parentUrn ? parentUrn : 'urn'}:${tag}:${type}:{${name}}`
}

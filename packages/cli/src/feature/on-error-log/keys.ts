// The one definition of the sourcemap bucket layout, shared by the
// deploy-time uploader, the runtime reader & the IAM grant - so the
// writer & reader can never drift apart. Must stay dependency free:
// the error-log server bundle imports it.

export const SOURCEMAP_ROOT = 'sourcemaps/'

export const formatSourcemapPrefix = (name: string, hash: string) => {
	return `${SOURCEMAP_ROOT}${name}/${hash}/`
}

// A build hash is hex, so the "versions" segment can never collide.
export const formatSourcemapVersionKey = (name: string, version: string) => {
	return `${SOURCEMAP_ROOT}${name}/versions/${version}`
}

export { OpenSearchServer, type OpenSearchServerOptions, type OpenSearchEngineKind } from './open-search-server'
export { MemoryOpenSearchServer, type MemoryOpenSearchServerOptions } from './server'
export { RealOpenSearchServer, type RealOpenSearchServerOptions } from './opensearch/real-server'
export { OpenSearchError } from './errors'

// The real distribution helpers, for callers that manage the process
// themselves.
export { download } from './opensearch/download'
export { launch } from './opensearch/launch'
export { VERSION_3_5_0_MIN, type VersionArgs } from './opensearch/version'

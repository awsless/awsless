import { Settings } from './launch'

export type Version = `${string}.${string}.${string}`

export type VersionArgs = {
	version: Version
	settings: (opts: { port: number; host: string; cache: string }) => Settings
	started: (line: string) => boolean
}

// The core-only min distribution: needs a local JDK 21+ reachable
// through OPENSEARCH_JAVA_HOME or JAVA_HOME, but downloads & boots much
// faster than the full bundle. It has no security plugin, and passing a
// setting for an absent plugin fails the boot.
export const VERSION_3_5_0_MIN: VersionArgs = {
	version: '3.5.0',
	started: line => line.includes('o.o.n.node') && line.includes('started'),
	settings: ({ port, host, cache }) => ({
		'discovery.type': 'single-node',

		'http.host': host,
		'http.port': port,

		'path.data': `${cache}/data`,
		'path.logs': `${cache}/logs`,
	}),
}

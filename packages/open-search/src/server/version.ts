import { Settings } from './launch'

export type Version = `${string}.${string}.${string}`

// The full bundle ships every plugin plus its own JDK; the min
// distribution is core-only and needs a local JDK 21+ reachable through
// OPENSEARCH_JAVA_HOME or JAVA_HOME, but downloads and boots much faster.
export type Distribution = 'bundle' | 'min'

export type VersionArgs = {
	version: Version
	distribution: Distribution
	settings: (opts: { port: number; host: string; cache: string }) => Settings
	started: (line: string) => boolean
}

// Matches the OpenSearch engine version we run in production.
export const VERSION_3_5_0: VersionArgs = {
	version: '3.5.0',
	distribution: 'bundle',
	// Only the core node line counts: the bundle's performance analyzer
	// logs its own "... started" long before the HTTP server is up.
	started: line => line.includes('o.o.n.node') && line.includes('started'),
	settings: ({ port, host, cache }) => ({
		'discovery.type': 'single-node',

		'http.host': host,
		'http.port': port,

		'path.data': `${cache}/data`,
		'path.logs': `${cache}/logs`,

		'plugins.security.disabled': true,
	}),
}

// The min distribution boots ~2x faster than the bundle and downloads a
// quarter of the size. It has no security plugin, and passing a setting
// for an absent plugin fails the boot.
export const VERSION_3_5_0_MIN: VersionArgs = {
	version: '3.5.0',
	distribution: 'min',
	started: line => line.includes('o.o.n.node') && line.includes('started'),
	settings: ({ port, host, cache }) => ({
		'discovery.type': 'single-node',

		'http.host': host,
		'http.port': port,

		'path.data': `${cache}/data`,
		'path.logs': `${cache}/logs`,
	}),
}

import { Settings } from './launch'

export type Version = `${string}.${string}.${string}`

export type VersionArgs = {
	version: Version
	settings: (opts: { port: number; host: string; cache: string }) => Settings
	started: (line: string) => boolean
}

export const VERSION_2_8_0: VersionArgs = {
	version: '2.8.0',
	started: line => line.includes('started'),
	settings: ({ port, host, cache }) => ({
		'discovery.type': 'single-node',

		'http.host': host,
		'http.port': port,

		'path.data': `${cache}/data`,
		'path.logs': `${cache}/logs`,

		'plugins.security.disabled': true,
	}),
}

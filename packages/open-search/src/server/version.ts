import { Version } from "./download";
import { Settings } from "./launch";

export type VersionArgs = {
	version: Version,
	settings: (opts: { port: number, host: string }) => Settings
	started: (line:string) => boolean
}

export const VERSION_2_6_0: VersionArgs = {
	version: '2.6.0',
	started: line => line.includes('started'),
	settings: ({ port, host }) => ({
		'discovery.type': `single-node`,
		// 'discovery.cluster_formation_warning_timeout': `1ms`,

		'http.host': host,
		'http.port': port,

		'path.data': `data/${port}/data`,
		'path.logs': `data/${port}/logs`,

		'plugins.security.disabled': true,
	}),
}

export const VERSION_2_8_0:VersionArgs = {
	version: '2.8.0',
	started: (line) => line.includes('started'),
	settings: ({ port, host }) => ({
		'discovery.type': 'single-node',

		'http.host': host,
		'http.port': port,

		'path.data': `data/${port}/data`,
		'path.logs': `data/${port}/logs`,

		// 'plugins.performanceanalyzer.disabled': true,
		'plugins.security.disabled': true,
	})
}

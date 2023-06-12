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

		'http.host': host,
		'http.port': port,

		'path.data': `data/${port}/data`,
		'path.logs': `data/${port}/logs`,

		// 'plugins.security.disabled': true,


		// 'node.name': `opensearch-${port}-node1`,
		// 'cluster.name': `opensearch-${port}`,
		// 'cluster.initial_master_nodes': `opensearch-${port}-node1`,
		// 'node.data': true,
		// 'node.master': true,
		// 'gateway.recover_after_nodes': 1,
		// 'gateway.expected_nodes': 1,
	}),
}

export const VERSION_2_8_0:VersionArgs = {
	version: '2.8.0',
	started: (line) => line.includes('started'),
	settings: ({ port, host }) => ({
		'discovery.type': 'single-node',
		// 'cluster.name': `opensearch-${port}`,

		'http.host': host,
		'http.port': port,

		'path.data': `data/${port}/data`,
		'path.logs': `data/${port}/logs`,

		// 'plugins.performanceanalyzer.disabled': true,
		'plugins.security.disabled': true,
	})
}

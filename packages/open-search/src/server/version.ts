import { Version } from "./download";
import { Settings } from "./launch";

export type VersionArgs = {
	version: Version,
	settings: (opts: { port: number, host: string }) => Settings
	started: (line:string) => boolean
}

export const VERSION_7_7_1:VersionArgs = {
	version: '7.7.1',
	started: (line) => line.includes('started'),
	settings: ({ port, host }) => ({
		// 'node.name': `elasticsearch-${port}`,
		// 'node.roles': '[ master, data ]',

		// 'node.data': true,
		// 'node.master': true,

		// 'cluster.name': `elasticsearch-cluster-${port}`,
		// 'cluster.initial_master_nodes': `[ elasticsearch-${port} ]`,

		// 'discovery.type': `single-node`,
		// 'discovery.seed_hosts': `${host}:9300`,
		// 'discovery.cluster_formation_warning_timeout': `1ms`,
		// 'discovery.zen.minimum_master_nodes': 1,

		'network.host': host,
		'http.port': port,

		'path.data': `data/${port}/data`,
		'path.logs': `data/${port}/logs`,
	})
}

export const VERSION_8_8_0:VersionArgs = {
	version: '8.8.0',
	started: (line) => line.includes('license') && line.includes('mode [basic] - valid'),
	settings: ({ port, host }) => ({
		'node.name': `elasticsearch-${port}`,
		'node.roles': '[ master, data ]',

		'cluster.name': `elasticsearch-cluster-${port}`,
		// 'cluster.initial_master_nodes': `[ elasticsearch-${port} ]`,

		'discovery.type': `single-node`,
		'discovery.cluster_formation_warning_timeout': `1ms`,

		'network.host': host,
		'http.port': port,

		'path.data': `data/${port}/data`,
		'path.logs': `data/${port}/logs`,

		'xpack.security.enabled': false,
		'xpack.security.authc.api_key.enabled': false,
		'xpack.security.autoconfiguration.enabled': false,
		'xpack.security.enrollment.enabled': false,
		'xpack.security.http.ssl.enabled': false,
		'xpack.security.authc.token.enabled': false,
		'xpack.security.transport.ssl.enabled': false,
	})
}

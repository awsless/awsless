export type Version = `${string}.${string}.${string}`

export type VersionArgs = {
	version: Version
	settings: (opts: {
		port: number
		host: string
		cacheDir: string
	}) => Record<string, string | number | boolean>
	started: (line: string) => boolean
}

export const VERSION_8_0_32: VersionArgs = {
	version: '8.0.32',
	started: line => line.includes('mysql community server - gpl'),
	settings: ({ port, cacheDir }) => ({
		port,
		basedir: './',
		datadir: `${cacheDir}/data`,

		server_id: 1,
		default_time_zone: '+00:00',
		binlog_format: 'row',
		log_bin: 'mysql-bin.log', // relative to datadir
		binlog_checksum: 'CRC32',
		binlog_expire_logs_seconds: 0,
		max_binlog_size: '1M',
		innodb_buffer_pool_size: '128M',
		sql_mode:
			'NO_ENGINE_SUBSTITUTION,STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO',
	}),
}

import { OpenSearchEngineKind, OpenSearchServer, VersionArgs } from '@awsless/open-search-server'
import { mockClient } from './client'

type Options = {
	// 'memory' (default) runs the in-process server, 'opensearch' the real
	// distribution.
	engine?: OpenSearchEngineKind
	// Real engine only.
	version?: VersionArgs
	debug?: boolean
}

export const mockOpenSearch = ({ engine, version, debug }: Options = {}) => {
	beforeAll &&
		beforeAll(async () => {
			const server = new OpenSearchServer({ engine, version, debug })
			await server.listen()

			mockClient(server.host, server.port)

			return async () => {
				await server.close()
			}
		}, 1000 * 1000)
}

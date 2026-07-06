export type SocketData = {
	context?: Record<string, unknown>
	allowed: string[]
	// topics: string[]
}

export type Socket = Bun.ServerWebSocket<SocketData>

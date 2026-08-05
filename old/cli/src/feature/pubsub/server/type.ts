import type { UUID } from 'node:crypto'

export type SocketData = {
	id: UUID
	ip: string
	authenticated: boolean
	authenticating?: boolean
	authTimeout?: ReturnType<typeof setTimeout>
	sessionTimeout?: ReturnType<typeof setTimeout>
	context?: Record<string, unknown>
	allowed: string[]
}

export type Socket = Bun.ServerWebSocket<SocketData>

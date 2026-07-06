type EventType = 'connected' | 'disconnected' | 'subscribe' | 'unsubscribe'

export const publishEvent = (type: EventType, payload: unknown) => {
	// ...
	console.log(type, payload)
	//
}

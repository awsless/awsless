
type Payload = {
	Records: {
		body: string
	}[]
}

export default async (event:Payload) => {
	return event
}

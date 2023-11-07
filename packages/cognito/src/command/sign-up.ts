import { Client } from '../client.js'

export type SignUpProps = {
	username?: string
	password?: string
	attributes?: Record<string, string>
}

export const signUp = async (client: Client, props: SignUpProps) => {
	await client.call('SignUp', {
		ClientId: client.id,
		Username: props.username,
		Password: props.password,
		UserAttributes: Object.entries(props.attributes ?? {}).map(([key, value]) => {
			return { Name: key, Value: value }
		}),
	})
}

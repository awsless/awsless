import { Client } from '../client'

export type ForgotPasswordProps = {
	username: string
}

export const forgotPassword = async (client: Client, props: ForgotPasswordProps) => {
	return client.call('ForgotPassword', {
		ClientId: client.id,
		Username: props.username,
	})
}
